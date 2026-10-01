import { and, asc, eq, sql, type SQLWrapper } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { randomUUID } from "node:crypto";
import { creed_members, creeds, strap_vault_folders as folders, creed_vault_items as items } from "../../../db/schema/application.ts";
import type { Viewer } from "../../authz/viewer.ts";
import { decryptVaultSecret, encryptVaultSecret } from "../../vault-crypto.ts";
import { vaultGrantCovers } from "../../vault-grants.ts";

export class VaultRepositoryError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export type VaultCredential = { keyId: string; creedId: string; vaultItemIds: readonly string[]; vaultFolderIds: readonly string[] };
const NOT_GRANTED = "Secret access was not granted to this key.";
const metadata = { id: items.id, creed_id: items.creed_id, folder_id: items.folder_id, name: items.name, description: items.description, created_by: items.created_by, created_at: items.created_at, updated_at: items.updated_at, last_accessed_at: items.last_accessed_at };
const folderMetadata = { id: folders.id, strap_id: folders.strap_id, name: folders.name, description: folders.description, created_at: folders.created_at, updated_at: folders.updated_at };
function scope(viewer: Viewer, profile: SQLWrapper) {
  return sql`exists (select 1 from public.creed_members member join public.creeds profile on profile.id = member.creed_id where member.creed_id = ${profile} and member.user_id = ${viewer.userId} and ((profile.type = 'personal' and profile.owner_user_id = ${viewer.userId} and member.role = 'owner') or (profile.type = 'company' and member.role in ('owner', 'admin'))))`;
}
function constraintError(error: unknown): { code?: string; constraint?: string } {
  // Drizzle wraps driver errors; postgres.js puts the SQLSTATE on the cause.
  for (let current = error; current && typeof current === "object"; current = (current as { cause?: unknown }).cause) {
    const { code, constraint_name: constraint } = current as { code?: unknown; constraint_name?: unknown };
    if (typeof code === "string") return { code, constraint: typeof constraint === "string" ? constraint : undefined };
  }
  return {};
}
// Maps the expected integrity failures to client errors and rethrows the rest.
async function mapConstraints<T>(run: () => Promise<T>): Promise<T> {
  try { return await run(); } catch (error) {
    const { code, constraint } = constraintError(error);
    if (code === "23505" && constraint === "strap_vault_folders_name_idx") throw new VaultRepositoryError("A folder with this name already exists.", 409);
    if (code === "23505" && constraint === "creed_vault_items_name_idx") throw new VaultRepositoryError("A secret with this name already exists.", 409);
    if (code === "23503" && constraint === "creed_vault_items_folder_fkey") throw new VaultRepositoryError("Folder not found in this Strap.", 400);
    throw error;
  }
}
async function requireVaultAccess(db: PostgresJsDatabase, viewer: Viewer, profileId: string) {
  const [access] = await db.select({ id: creeds.id }).from(creeds).where(and(eq(creeds.id, profileId), scope(viewer, creeds.id))).limit(1);
  if (!access) throw new VaultRepositoryError("Forbidden", 403);
}
export async function vaultMetadata(db: PostgresJsDatabase, viewer: Viewer, id: string) {
  const [row] = await db.select(metadata).from(items).where(and(eq(items.id, id), scope(viewer, items.creed_id))).limit(1);
  if (!row) throw new VaultRepositoryError("Vault item not found or access denied.", 403);
  return row;
}
export async function vaultList(db: PostgresJsDatabase, viewer: Viewer, profileId: string) {
  await requireVaultAccess(db, viewer, profileId);
  return db.select(metadata).from(items).where(and(eq(items.creed_id, profileId), scope(viewer, items.creed_id))).orderBy(asc(items.name));
}
export async function vaultCreate(db: PostgresJsDatabase, viewer: Viewer, input: { creedId: string; name: string; description: string; secret: string; folderId?: string | null }) {
  return mapConstraints(() => db.transaction(async tx => {
    const [access] = await tx.select({ id: creeds.id }).from(creeds).innerJoin(creed_members, eq(creed_members.creed_id, creeds.id))
      .where(and(eq(creeds.id, input.creedId), eq(creed_members.user_id, viewer.userId), scope(viewer, creeds.id))).for("share");
    if (!access) throw new VaultRepositoryError("Forbidden", 403);
    const id = randomUUID();
    const [row] = await tx.insert(items).values({ id, creed_id: input.creedId, folder_id: input.folderId ?? null, created_by: viewer.userId, name: input.name, description: input.description,
      secret_ciphertext: encryptVaultSecret(input.secret, id, input.creedId) }).returning(metadata);
    return row;
  }));
}
/** folderId: undefined keeps the current folder, null moves the item out of any folder. */
export async function vaultUpdate(db: PostgresJsDatabase, viewer: Viewer, input: { itemId: string; name: string; description: string; secret: string | null; folderId?: string | null }) {
  const row = await vaultMetadata(db, viewer, input.itemId);
  const [updated] = await mapConstraints(() => db.update(items).set({ name: input.name, description: input.description, updated_at: new Date().toISOString(),
    ...(input.folderId !== undefined ? { folder_id: input.folderId } : {}),
    ...(input.secret !== null ? { secret_ciphertext: encryptVaultSecret(input.secret, row.id, row.creed_id) } : {}) })
    .where(and(eq(items.id, row.id), scope(viewer, items.creed_id))).returning(metadata));
  if (!updated) throw new VaultRepositoryError("Forbidden", 403);
  return { previous: row, updated };
}
export async function vaultDelete(db: PostgresJsDatabase, viewer: Viewer, id: string) {
  const [row] = await db.delete(items).where(and(eq(items.id, id), scope(viewer, items.creed_id))).returning(metadata);
  if (!row) throw new VaultRepositoryError("Forbidden", 403);
  return row;
}
export async function vaultFolderList(db: PostgresJsDatabase, viewer: Viewer, profileId: string) {
  await requireVaultAccess(db, viewer, profileId);
  return db.select(folderMetadata).from(folders).where(and(eq(folders.strap_id, profileId), scope(viewer, folders.strap_id))).orderBy(asc(folders.name));
}
export async function vaultFolderCreate(db: PostgresJsDatabase, viewer: Viewer, input: { strapId: string; name: string; description: string }) {
  await requireVaultAccess(db, viewer, input.strapId);
  const [row] = await mapConstraints(() => db.insert(folders).values({ strap_id: input.strapId, name: input.name, description: input.description }).returning(folderMetadata));
  return row;
}
export async function vaultFolderUpdate(db: PostgresJsDatabase, viewer: Viewer, input: { folderId: string; name: string; description: string }) {
  const [row] = await mapConstraints(() => db.update(folders).set({ name: input.name, description: input.description, updated_at: new Date().toISOString() })
    .where(and(eq(folders.id, input.folderId), scope(viewer, folders.strap_id))).returning(folderMetadata));
  if (!row) throw new VaultRepositoryError("Folder not found or access denied.", 403);
  return row;
}
/** Items in a deleted folder stay in the Vault without a folder. Keys lose folder-based access to them. */
export async function vaultFolderDelete(db: PostgresJsDatabase, viewer: Viewer, id: string) {
  return db.transaction(async tx => {
    const [folder] = await tx.select(folderMetadata).from(folders).where(and(eq(folders.id, id), scope(viewer, folders.strap_id))).for("update");
    if (!folder) throw new VaultRepositoryError("Folder not found or access denied.", 403);
    const moved = await tx.update(items).set({ folder_id: null, updated_at: new Date().toISOString() })
      .where(and(eq(items.creed_id, folder.strap_id), eq(items.folder_id, folder.id))).returning({ id: items.id });
    await tx.delete(folders).where(eq(folders.id, folder.id));
    return { folder, movedItemIds: moved.map(item => item.id) };
  });
}
export async function vaultReveal(db: PostgresJsDatabase, viewer: Viewer, id: string, audit: (profileId: string, grant: { folderId: string } | null) => Promise<void>, credential?: VaultCredential) {
  // A key with neither this item nor any folder grant never reads the item.
  if (credential && !credential.vaultItemIds.includes(id) && credential.vaultFolderIds.length === 0) {
    throw new VaultRepositoryError(NOT_GRANTED, 403);
  }
  const credentialScope = credential ? eq(items.creed_id, credential.creedId) : undefined;
  const [row] = await db.select({ ...metadata, ciphertext: items.secret_ciphertext }).from(items).where(and(eq(items.id, id), credentialScope, scope(viewer, items.creed_id))).limit(1);
  if (!row) throw new VaultRepositoryError(credential ? NOT_GRANTED : "Forbidden", 403);
  if (credential && !vaultGrantCovers(credential, { id: row.id, folderId: row.folder_id })) throw new VaultRepositoryError(NOT_GRANTED, 403);
  // A folder grant holds only while the item stays in that folder.
  const viaFolder = credential && !credential.vaultItemIds.includes(id) && row.folder_id ? row.folder_id : null;
  // Do not decrypt or return plaintext if the required audit cannot persist.
  try { await audit(row.creed_id, viaFolder ? { folderId: viaFolder } : null); } catch { throw new VaultRepositoryError("Vault reveal audit is unavailable.", 503); }
  const accessedAt = new Date().toISOString();
  const [stillAuthorized] = await db.update(items).set({ last_accessed_at: accessedAt })
    .where(and(eq(items.id, id), credentialScope, viaFolder ? eq(items.folder_id, viaFolder) : undefined, eq(items.secret_ciphertext, row.ciphertext), scope(viewer, items.creed_id))).returning({ id: items.id });
  if (!stillAuthorized) throw new VaultRepositoryError("Vault item changed or access was removed. Try again.", 409);
  const { ciphertext, ...item } = row;
  return { item: { ...item, last_accessed_at: accessedAt }, secret: decryptVaultSecret(ciphertext, item.id, item.creed_id) };
}
