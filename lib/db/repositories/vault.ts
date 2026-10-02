import { and, asc, eq, inArray, or, sql, type SQLWrapper } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { randomUUID } from "node:crypto";
import { creed_headless_access_keys as headlessKeys, creed_members, creeds, strap_vault_folders as folders, creed_vault_items as items } from "../../../db/schema/application.ts";
import type { Viewer } from "../../authz/viewer.ts";
import { decryptVaultSecret, encryptVaultSecret } from "../../vault-crypto.ts";
import { stillUnexpired } from "../../headless-access-shared.ts";
import { vaultGrantCovers } from "../../vault-grants.ts";

export class VaultRepositoryError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
/** keyHash is the digest the request authenticated with; reveal rechecks it before decrypting. */
export type VaultCredential = { keyId: string; keyHash: string; creedId: string; vaultItemIds: readonly string[]; vaultFolderIds: readonly string[] };
const NOT_GRANTED = "Secret access was not granted to this key.";
const metadata = { id: items.id, creed_id: items.creed_id, folder_id: items.folder_id, name: items.name, description: items.description, created_by: items.created_by, created_at: items.created_at, updated_at: items.updated_at, last_accessed_at: items.last_accessed_at };
const folderMetadata = { id: folders.id, strap_id: folders.strap_id, name: folders.name, description: folders.description, created_at: folders.created_at, updated_at: folders.updated_at };
/** Vault access: a personal profile's owner, or a Company owner or admin. */
function scope(viewer: Viewer, profile: SQLWrapper) {
  return sql`exists (select 1 from public.creed_members member join public.creeds profile on profile.id = member.creed_id where member.creed_id = ${profile} and member.user_id = ${viewer.userId} and ((profile.type = 'personal' and profile.owner_user_id = ${viewer.userId} and member.role = 'owner') or (profile.type = 'company' and member.role in ('owner', 'admin'))))`;
}
/**
 * Locks the viewer's membership row until the transaction ends and reports
 * whether it grants Vault access, by the same rule as scope. Every write or
 * reveal that needs the Vault role calls this inside its transaction, before
 * any other row lock, so a demotion or removal cannot commit between the check
 * and the write. The role is tested on the locked row itself: if a demotion
 * commits while this waits, Postgres rechecks the new row version, whereas the
 * scope subquery would keep its older snapshot and still see the old role.
 *
 * The profile row is locked first, FOR KEY SHARE, in its own statement. A
 * profile deletion locks that row and then cascades to the membership row, so
 * taking the two in the same order keeps a concurrent deletion waiting instead
 * of deadlocking with this transaction's later inserts and updates. KEY SHARE
 * does not block ordinary profile updates.
 */
export async function lockVaultAccess(tx: Pick<PostgresJsDatabase, "select">, viewer: Viewer, profileId: string): Promise<boolean> {
  const [profile] = await tx.select({ id: creeds.id }).from(creeds).where(eq(creeds.id, profileId)).for("key share");
  if (!profile) return false;
  const [access] = await tx.select({ id: creeds.id }).from(creeds).innerJoin(creed_members, eq(creed_members.creed_id, creeds.id))
    .where(and(eq(creeds.id, profileId), eq(creed_members.user_id, viewer.userId), or(
      and(eq(creeds.type, "personal"), eq(creeds.owner_user_id, viewer.userId), eq(creed_members.role, "owner")),
      and(eq(creeds.type, "company"), inArray(creed_members.role, ["owner", "admin"])),
    ))).for("share", { of: creed_members });
  return access !== undefined;
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
    // A timestamp-shaped client value that Postgres cannot read, such as an expectedUpdatedAt of February 30.
    if (code === "22007" || code === "22008" || code === "22009") throw new VaultRepositoryError("Invalid date or time.", 400);
    throw error;
  }
}
async function requireVaultAccess(db: PostgresJsDatabase, viewer: Viewer, profileId: string) {
  const [access] = await db.select({ id: creeds.id }).from(creeds).where(and(eq(creeds.id, profileId), scope(viewer, creeds.id))).limit(1);
  if (!access) throw new VaultRepositoryError("Forbidden", 403);
}
export async function vaultMetadata(db: Pick<PostgresJsDatabase, "select">, viewer: Viewer, id: string) {
  const [row] = await db.select(metadata).from(items).where(and(eq(items.id, id), scope(viewer, items.creed_id))).limit(1);
  if (!row) throw new VaultRepositoryError("Vault item not found or access denied.", 403);
  return row;
}
/**
 * Secrets in name and id order. folderId restricts the list to one folder,
 * after resumes past a secret already seen, and limit caps the rows read.
 */
export async function vaultList(db: PostgresJsDatabase, viewer: Viewer, profileId: string, options: { folderId?: string; after?: { name: string; id: string }; limit?: number } = {}) {
  await requireVaultAccess(db, viewer, profileId);
  const rows = db.select(metadata).from(items)
    .where(and(eq(items.creed_id, profileId), options.folderId ? eq(items.folder_id, options.folderId) : undefined,
      options.after ? sql`(${items.name}, ${items.id}) > (${options.after.name}, ${options.after.id}::uuid)` : undefined, scope(viewer, items.creed_id)))
    .orderBy(asc(items.name), asc(items.id)).$dynamic();
  return options.limit === undefined ? rows : rows.limit(options.limit);
}
export async function vaultCreate(db: PostgresJsDatabase, viewer: Viewer, input: { creedId: string; name: string; description: string; secret: string; folderId?: string | null }) {
  return mapConstraints(() => db.transaction(async tx => {
    if (!(await lockVaultAccess(tx, viewer, input.creedId))) throw new VaultRepositoryError("Forbidden", 403);
    const id = randomUUID();
    const [row] = await tx.insert(items).values({ id, creed_id: input.creedId, folder_id: input.folderId ?? null, created_by: viewer.userId, name: input.name, description: input.description,
      secret_ciphertext: encryptVaultSecret(input.secret, id, input.creedId) }).returning(metadata);
    return row;
  }));
}
const FOLDER_MOVED = "This secret was moved to another folder in another session. Reload and try again.";
/**
 * folderId: undefined keeps the current folder, null moves the item out of any
 * folder. A move must name the folder the caller expected the item to be in,
 * because folder membership grants key access: a stale move must not restore
 * access another session just removed.
 */
export async function vaultUpdate(db: PostgresJsDatabase, viewer: Viewer, input: { itemId: string; name: string; description: string; secret: string | null; folderId?: string | null; expectedFolderId?: string | null }) {
  const moving = input.folderId !== undefined;
  if (moving && input.expectedFolderId === undefined) throw new VaultRepositoryError("expectedFolderId is required when changing the folder.", 400);
  return mapConstraints(() => db.transaction(async tx => {
    const row = await vaultMetadata(tx, viewer, input.itemId);
    if (!(await lockVaultAccess(tx, viewer, row.creed_id))) throw new VaultRepositoryError("Forbidden", 403);
    if (moving && row.folder_id !== input.expectedFolderId) throw new VaultRepositoryError(FOLDER_MOVED, 409);
    const [updated] = await tx.update(items).set({ name: input.name, description: input.description, updated_at: new Date().toISOString(),
      ...(moving ? { folder_id: input.folderId } : {}),
      ...(input.secret !== null ? { secret_ciphertext: encryptVaultSecret(input.secret, row.id, row.creed_id) } : {}) })
      .where(and(eq(items.id, row.id), scope(viewer, items.creed_id),
        moving ? sql`${items.folder_id} is not distinct from ${input.expectedFolderId ?? null}::uuid` : undefined)).returning(metadata);
    if (!updated) throw new VaultRepositoryError(moving ? FOLDER_MOVED : "Forbidden", moving ? 409 : 403);
    return { previous: row, updated };
  }));
}
export async function vaultDelete(db: PostgresJsDatabase, viewer: Viewer, id: string) {
  return db.transaction(async tx => {
    const [target] = await tx.select({ creedId: items.creed_id }).from(items).where(and(eq(items.id, id), scope(viewer, items.creed_id))).limit(1);
    if (!target || !(await lockVaultAccess(tx, viewer, target.creedId))) throw new VaultRepositoryError("Forbidden", 403);
    const [row] = await tx.delete(items).where(and(eq(items.id, id), scope(viewer, items.creed_id))).returning(metadata);
    if (!row) throw new VaultRepositoryError("Forbidden", 403);
    return row;
  });
}
export async function vaultFolderList(db: PostgresJsDatabase, viewer: Viewer, profileId: string, options: { limit?: number } = {}) {
  await requireVaultAccess(db, viewer, profileId);
  const rows = db.select(folderMetadata).from(folders).where(and(eq(folders.strap_id, profileId), scope(viewer, folders.strap_id))).orderBy(asc(folders.name)).$dynamic();
  return options.limit === undefined ? rows : rows.limit(options.limit);
}
/** Number of secrets in each of the given folders, counted in the database. */
export async function vaultFolderItemCounts(db: PostgresJsDatabase, viewer: Viewer, profileId: string, folderIds: readonly string[]) {
  await requireVaultAccess(db, viewer, profileId);
  if (!folderIds.length) return [];
  return db.select({ folderId: items.folder_id, count: sql<number>`count(*)::int` }).from(items)
    .where(and(eq(items.creed_id, profileId), inArray(items.folder_id, [...folderIds]), scope(viewer, items.creed_id))).groupBy(items.folder_id);
}
/**
 * Finds one folder by exact id, or else by name compared the way the unique
 * folder-name index compares it (lower(name)), anywhere in the profile.
 */
export async function vaultFolderFind(db: PostgresJsDatabase, viewer: Viewer, profileId: string, nameOrId: string) {
  await requireVaultAccess(db, viewer, profileId);
  const inProfile = and(eq(folders.strap_id, profileId), scope(viewer, folders.strap_id));
  if (FOLDER_ID.test(nameOrId)) {
    const [byId] = await db.select(folderMetadata).from(folders).where(and(inProfile, eq(folders.id, nameOrId.toLowerCase()))).limit(1);
    if (byId) return byId;
  }
  const [byName] = await db.select(folderMetadata).from(folders).where(and(inProfile, sql`lower(${folders.name}) = lower(${nameOrId})`)).limit(1);
  return byName ?? null;
}
const FOLDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function vaultFolderCreate(db: PostgresJsDatabase, viewer: Viewer, input: { strapId: string; name: string; description: string }) {
  // Like vaultCreate: the membership row stays locked until the insert commits,
  // so a concurrent demotion or removal cannot interleave.
  return mapConstraints(() => db.transaction(async tx => {
    if (!(await lockVaultAccess(tx, viewer, input.strapId))) throw new VaultRepositoryError("Forbidden", 403);
    const [row] = await tx.insert(folders).values({ strap_id: input.strapId, name: input.name, description: input.description }).returning(folderMetadata);
    return row;
  }));
}
/**
 * Counts the items a key can reveal now, directly or through its folders, and
 * that its user may still access. Sizes the reveal rate limit without telling a
 * demoted user anything about secrets they can no longer see.
 */
export async function vaultGrantCoverage(db: PostgresJsDatabase, viewer: Viewer, credential: Pick<VaultCredential, "creedId" | "vaultItemIds" | "vaultFolderIds">) {
  const grants = [
    ...(credential.vaultItemIds.length ? [inArray(items.id, [...credential.vaultItemIds])] : []),
    ...(credential.vaultFolderIds.length ? [inArray(items.folder_id, [...credential.vaultFolderIds])] : []),
  ];
  if (!grants.length) return 0;
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(items).where(and(eq(items.creed_id, credential.creedId), or(...grants), scope(viewer, items.creed_id)));
  return row?.count ?? 0;
}
const FOLDER_CHANGED = "This folder was changed in another session. Review the current version and try again.";
/**
 * expectedUpdatedAt is the folder's updatedAt when the editor opened. A save
 * based on an older version is rejected instead of overwriting another
 * manager's rename or description.
 */
export async function vaultFolderUpdate(db: PostgresJsDatabase, viewer: Viewer, input: { folderId: string; name: string; description: string; expectedUpdatedAt: string }) {
  return mapConstraints(() => db.transaction(async tx => {
    const [folder] = await tx.select({ strapId: folders.strap_id }).from(folders).where(and(eq(folders.id, input.folderId), scope(viewer, folders.strap_id))).limit(1);
    if (!folder || !(await lockVaultAccess(tx, viewer, folder.strapId))) throw new VaultRepositoryError("Folder not found or access denied.", 403);
    // updated_at is the folder's version, so it takes the database clock's microseconds.
    const [row] = await tx.update(folders).set({ name: input.name, description: input.description, updated_at: sql`now()` })
      .where(and(eq(folders.id, input.folderId), sql`${folders.updated_at} = ${input.expectedUpdatedAt}::timestamptz`)).returning(folderMetadata);
    if (!row) throw new VaultRepositoryError(FOLDER_CHANGED, 409);
    return row;
  }));
}
const FOLDER_CONTENTS_CHANGED = "This folder's secrets changed in another session. Review the folder and try again.";
/**
 * Items in a deleted folder stay in the Vault without a folder. Keys lose
 * folder-based access to them. expectedItemIds are the secrets the caller saw
 * in the folder: a deletion confirmed from an older view must not take access
 * away from a secret it never showed.
 */
export async function vaultFolderDelete(db: PostgresJsDatabase, viewer: Viewer, id: string, expectedItemIds: readonly string[]) {
  return db.transaction(async tx => {
    // Hold the membership row as folder creation does, so a demotion or removal
    // cannot commit between this check and the writes below. The folder is
    // locked only after that, in the order a profile deletion takes them.
    const [found] = await tx.select({ strapId: folders.strap_id }).from(folders).where(and(eq(folders.id, id), scope(viewer, folders.strap_id))).limit(1);
    if (!found || !(await lockVaultAccess(tx, viewer, found.strapId))) throw new VaultRepositoryError("Folder not found or access denied.", 403);
    const [folder] = await tx.select(folderMetadata).from(folders).where(eq(folders.id, id)).for("update");
    if (!folder) throw new VaultRepositoryError("Folder not found or access denied.", 403);
    // The folder lock keeps secrets from being created in or moved into it
    // until this commits, so its current contents can be compared here.
    const contents = await tx.select({ id: items.id }).from(items).where(and(eq(items.creed_id, folder.strap_id), eq(items.folder_id, folder.id)));
    const expected = new Set(expectedItemIds.map((itemId) => itemId.toLowerCase()));
    if (contents.length !== expected.size || contents.some((item) => !expected.has(item.id.toLowerCase()))) {
      throw new VaultRepositoryError(FOLDER_CONTENTS_CHANGED, 409);
    }
    // Only the number of moved items is kept: a large folder must not produce
    // an unbounded response or audit payload.
    const moved = await tx.update(items).set({ folder_id: null, updated_at: new Date().toISOString() })
      .where(and(eq(items.creed_id, folder.strap_id), eq(items.folder_id, folder.id)));
    await tx.delete(folders).where(eq(folders.id, folder.id));
    return { folder, movedItemCount: moved.count };
  });
}
/** The reveal transaction. The required audit row is written on it, so it commits with the access record. */
export type VaultTransaction = Parameters<Parameters<PostgresJsDatabase["transaction"]>[0]>[0];
export async function vaultReveal(db: PostgresJsDatabase, viewer: Viewer, id: string, audit: (tx: VaultTransaction, profileId: string, grant: { folderId: string } | null) => Promise<void>, credential?: VaultCredential) {
  // A key with neither this item nor any folder grant never reads the item.
  if (credential && !credential.vaultItemIds.includes(id) && credential.vaultFolderIds.length === 0) {
    throw new VaultRepositoryError(NOT_GRANTED, 403);
  }
  const credentialScope = credential ? eq(items.creed_id, credential.creedId) : undefined;
  const [row] = await db.select({ ...metadata, ciphertext: items.secret_ciphertext }).from(items).where(and(eq(items.id, id), credentialScope, scope(viewer, items.creed_id))).limit(1);
  if (!row) throw new VaultRepositoryError(credential ? NOT_GRANTED : "Forbidden", 403);
  if (credential && !vaultGrantCovers(credential, { id: row.id, folderId: row.folder_id })) throw new VaultRepositoryError(NOT_GRANTED, 403);
  const accessedAt = new Date().toISOString();
  const changed = () => new VaultRepositoryError("Vault item changed or access was removed. Try again.", 409);
  // The final authorization and the required audit commit together: a refused
  // reveal leaves no audit row, and an audit failure leaves no access record.
  // Plaintext is decrypted only after the commit.
  await db.transaction(async (tx) => {
    // The revealing user keeps the Vault role until the reveal commits: a
    // demotion or removal either waits for it or makes it fail. The membership
    // row is locked before the key row, in the same order as grant edits.
    if (!(await lockVaultAccess(tx, viewer, row.creed_id))) throw changed();
    // The key was resolved at the start of the request. Lock its row and use
    // the live state: it must still have the hash it authenticated with, be
    // unrevoked and unexpired, and grant this item. The audit then names the
    // grant that actually authorized the reveal.
    let grant: { folderId: string } | null = null;
    if (credential) {
      const [key] = await tx.select({
        itemIds: headlessKeys.vault_item_ids,
        folderIds: headlessKeys.vault_folder_ids,
        revokedAt: headlessKeys.revoked_at,
        expiresAt: headlessKeys.expires_at,
      }).from(headlessKeys).where(and(eq(headlessKeys.id, credential.keyId), eq(headlessKeys.key_hash, credential.keyHash))).for("share");
      // Expiry is checked against the clock after the lock: the lock may have
      // waited, and SQL now() is the transaction's start time.
      if (!key || key.revokedAt !== null || !stillUnexpired(key.expiresAt)) throw changed();
      if (!key.itemIds.includes(row.id)) {
        if (!row.folder_id || !key.folderIds.includes(row.folder_id)) throw changed();
        grant = { folderId: row.folder_id };
      }
    }
    // A folder grant holds only while the item stays in that folder.
    const [stillAuthorized] = await tx.update(items).set({ last_accessed_at: accessedAt })
      .where(and(eq(items.id, id), credentialScope, grant ? eq(items.folder_id, grant.folderId) : undefined, eq(items.secret_ciphertext, row.ciphertext), scope(viewer, items.creed_id))).returning({ id: items.id });
    if (!stillAuthorized) throw changed();
    try { await audit(tx, row.creed_id, grant); } catch { throw new VaultRepositoryError("Vault reveal audit is unavailable.", 503); }
  });
  const { ciphertext, ...item } = row;
  return { item: { ...item, last_accessed_at: accessedAt }, secret: decryptVaultSecret(ciphertext, item.id, item.creed_id) };
}
