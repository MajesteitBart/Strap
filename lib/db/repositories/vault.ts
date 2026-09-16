import { and, asc, eq, sql, type SQLWrapper } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { randomUUID } from "node:crypto";
import { creed_members, creeds, creed_vault_items as items } from "../../../db/schema/application.ts";
import type { Viewer } from "../../authz/viewer.ts";
import { decryptVaultSecret, encryptVaultSecret } from "../../vault-crypto.ts";

export class VaultRepositoryError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
const metadata = { id: items.id, creed_id: items.creed_id, name: items.name, description: items.description, created_by: items.created_by, created_at: items.created_at, updated_at: items.updated_at, last_accessed_at: items.last_accessed_at };
function scope(viewer: Viewer, profile: SQLWrapper) {
  return sql`exists (select 1 from public.creed_members member join public.creeds profile on profile.id = member.creed_id where member.creed_id = ${profile} and member.user_id = ${viewer.userId} and ((profile.type = 'personal' and profile.owner_user_id = ${viewer.userId} and member.role = 'owner') or (profile.type = 'company' and member.role in ('owner', 'admin'))))`;
}
export async function vaultMetadata(db: PostgresJsDatabase, viewer: Viewer, id: string) {
  const [row] = await db.select(metadata).from(items).where(and(eq(items.id, id), scope(viewer, items.creed_id))).limit(1);
  if (!row) throw new VaultRepositoryError("Vault item not found or access denied.", 403);
  return row;
}
export async function vaultList(db: PostgresJsDatabase, viewer: Viewer, profileId: string) {
  const [access] = await db.select({ id: creeds.id }).from(creeds).where(and(eq(creeds.id, profileId), scope(viewer, creeds.id))).limit(1);
  if (!access) throw new VaultRepositoryError("Forbidden", 403);
  return db.select(metadata).from(items).where(and(eq(items.creed_id, profileId), scope(viewer, items.creed_id))).orderBy(asc(items.name));
}
export async function vaultCreate(db: PostgresJsDatabase, viewer: Viewer, input: { creedId: string; name: string; description: string; secret: string }) {
  return db.transaction(async tx => {
    const [access] = await tx.select({ id: creeds.id }).from(creeds).innerJoin(creed_members, eq(creed_members.creed_id, creeds.id))
      .where(and(eq(creeds.id, input.creedId), eq(creed_members.user_id, viewer.userId), scope(viewer, creeds.id))).for("share");
    if (!access) throw new VaultRepositoryError("Forbidden", 403);
    const id = randomUUID();
    const [row] = await tx.insert(items).values({ id, creed_id: input.creedId, created_by: viewer.userId, name: input.name, description: input.description,
      secret_ciphertext: encryptVaultSecret(input.secret, id, input.creedId) }).returning(metadata);
    return row;
  });
}
export async function vaultUpdate(db: PostgresJsDatabase, viewer: Viewer, input: { itemId: string; name: string; description: string; secret: string | null }) {
  const row = await vaultMetadata(db, viewer, input.itemId);
  const [updated] = await db.update(items).set({ name: input.name, description: input.description, updated_at: new Date().toISOString(),
    ...(input.secret !== null ? { secret_ciphertext: encryptVaultSecret(input.secret, row.id, row.creed_id) } : {}) })
    .where(and(eq(items.id, row.id), scope(viewer, items.creed_id))).returning(metadata);
  if (!updated) throw new VaultRepositoryError("Forbidden", 403);
  return updated;
}
export async function vaultDelete(db: PostgresJsDatabase, viewer: Viewer, id: string) {
  const [row] = await db.delete(items).where(and(eq(items.id, id), scope(viewer, items.creed_id))).returning(metadata);
  if (!row) throw new VaultRepositoryError("Forbidden", 403);
  return row;
}
export async function vaultReveal(db: PostgresJsDatabase, viewer: Viewer, id: string, audit: (profileId: string) => Promise<void>) {
  const [row] = await db.select({ ...metadata, ciphertext: items.secret_ciphertext }).from(items).where(and(eq(items.id, id), scope(viewer, items.creed_id))).limit(1);
  if (!row) throw new VaultRepositoryError("Forbidden", 403);
  // Do not decrypt or return plaintext if the required audit cannot persist.
  try { await audit(row.creed_id); } catch { throw new VaultRepositoryError("Vault reveal audit is unavailable.", 503); }
  const accessedAt = new Date().toISOString();
  const [stillAuthorized] = await db.update(items).set({ last_accessed_at: accessedAt }).where(and(eq(items.id, id), eq(items.secret_ciphertext, row.ciphertext), scope(viewer, items.creed_id))).returning({ id: items.id });
  if (!stillAuthorized) throw new VaultRepositoryError("Vault item changed or access was removed. Try again.", 409);
  const { ciphertext, ...item } = row;
  return { item: { ...item, last_accessed_at: accessedAt }, secret: decryptVaultSecret(ciphertext, item.id, item.creed_id) };
}
