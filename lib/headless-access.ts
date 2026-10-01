import { listVaultFolders, listVaultItems, VaultAccessError } from "@/lib/api-key-vault";
import { parseVaultFolderGrants, parseVaultItemGrants } from "@/lib/vault-grants";
import * as tables from "@/db/schema/application";
import { authorizeValues } from "@/lib/authz/policies";
import type { DatabaseContext } from "@/lib/db/context";
import { exactlyOne, maybeOne, query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import {
  createHeadlessKey,
  digestCredential,
  isHeadlessKey,
  type HeadlessKeyMode,
} from "@/lib/headless-access-shared";
import { getStrapRole } from "@/lib/strap-membership";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import "server-only";

type HeadlessKeyRow = {
  id: string;
  creed_id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  mode: HeadlessKeyMode;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
  vault_item_ids: string[];
  vault_folder_ids: string[];
};

export type HeadlessKeyMetadata = {
  id: string;
  creedId: string;
  name: string;
  prefix: string;
  mode: HeadlessKeyMode;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  vaultItemIds: string[];
  vaultFolderIds: string[];
};

export type ResolvedHeadlessKey = {
  keyId: string;
  userId: string;
  creedId: string;
  clientName: string;
  mode: HeadlessKeyMode;
  vaultItemIds: string[];
  vaultFolderIds: string[];
};

const keys = tables.creed_headless_access_keys;
// Every read returns metadata only; the key hash never leaves this module.
const KEY_COLUMNS = {
  id: keys.id, creed_id: keys.creed_id, user_id: keys.user_id, name: keys.name, key_prefix: keys.key_prefix, mode: keys.mode,
  expires_at: keys.expires_at, revoked_at: keys.revoked_at, last_used_at: keys.last_used_at, created_at: keys.created_at,
  vault_item_ids: keys.vault_item_ids, vault_folder_ids: keys.vault_folder_ids,
};

function adminDb(): DatabaseContext {
  return serviceContext("lib/headless-access.ts");
}

function toMetadata(row: HeadlessKeyRow): HeadlessKeyMetadata {
  return {
    id: row.id,
    creedId: row.creed_id,
    name: row.name,
    prefix: row.key_prefix,
    mode: row.mode,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    vaultItemIds: row.vault_item_ids,
    vaultFolderIds: row.vault_folder_ids,
  };
}

/**
 * Normalizes requested grants and rechecks live Vault permissions, including
 * the Company owner/admin gate. Every granted item and folder must belong to
 * the key's profile.
 */
async function authorizeVaultGrants(input: {
  userId: string;
  creedId: string;
  vaultItemIds?: unknown;
  vaultFolderIds?: unknown;
}): Promise<{ vaultItemIds: string[]; vaultFolderIds: string[] }> {
  const vaultItemIds = parseVaultItemGrants(input.vaultItemIds);
  const vaultFolderIds = parseVaultFolderGrants(input.vaultFolderIds);
  if (!vaultItemIds || !vaultFolderIds) throw new VaultAccessError("Invalid Vault grants.", 400);
  if (vaultItemIds.length) {
    const allowed = new Set((await listVaultItems(input.userId, input.creedId)).map((item) => item.id));
    if (vaultItemIds.some((id) => !allowed.has(id))) {
      throw new VaultAccessError("Vault items must belong to the selected Strap.", 403);
    }
  }
  if (vaultFolderIds.length) {
    const allowed = new Set((await listVaultFolders(input.userId, input.creedId)).map((folder) => folder.id));
    if (vaultFolderIds.some((id) => !allowed.has(id))) {
      throw new VaultAccessError("Vault folders must belong to the selected Strap.", 403);
    }
  }
  return { vaultItemIds, vaultFolderIds };
}

/** Revoked and expired keys can no longer be edited or rotated. */
function usable() {
  return and(isNull(keys.revoked_at), or(isNull(keys.expires_at), sql`${keys.expires_at} > now()`));
}

async function findActiveKey(userId: string, keyId: string): Promise<HeadlessKeyRow | null> {
  const { data, error } = await query(adminDb(), keys, "select", (database, scope) => database.select(KEY_COLUMNS).from(keys)
    .where(and(scope, eq(keys.id, keyId), eq(keys.user_id, userId), usable()))).then(maybeOne);
  if (error) throw new Error("Could not load headless access key.");
  return (data as HeadlessKeyRow | null) ?? null;
}

export async function listHeadlessKeys(userId: string, creedId: string): Promise<HeadlessKeyMetadata[]> {
  const { data, error } = await query(adminDb(), keys, "select", (database, scope) => database.select(KEY_COLUMNS).from(keys)
    .where(and(scope, eq(keys.user_id, userId), eq(keys.creed_id, creedId))).orderBy(desc(keys.created_at)));
  if (error) throw new Error("Could not list headless access keys.");
  return ((data as HeadlessKeyRow[] | null) ?? []).map(toMetadata);
}

export async function createHeadlessAccessKey(input: {
  userId: string;
  creedId: string;
  name: string;
  mode: HeadlessKeyMode;
  expiresAt: string | null;
  vaultItemIds?: string[];
  vaultFolderIds?: string[];
}): Promise<{ key: string; metadata: HeadlessKeyMetadata }> {
  const grants = await authorizeVaultGrants(input);
  const generated = createHeadlessKey();
  const { data, error } = await query(adminDb(), keys, "insert", async (database, _scope) => {
    const values = {
      creed_id: input.creedId,
      user_id: input.userId,
      name: input.name,
      key_prefix: generated.prefix,
      key_hash: generated.hash,
      mode: input.mode,
      expires_at: input.expiresAt,
      vault_item_ids: grants.vaultItemIds,
      vault_folder_ids: grants.vaultFolderIds,
    } as typeof keys.$inferInsert;
    await authorizeValues(adminDb(), keys, "insert", values);
    return database.insert(keys).values(values).returning(KEY_COLUMNS);
  }).then(exactlyOne);
  if (error || !data) throw new Error("Could not create headless access key.");
  return { key: generated.key, metadata: toMetadata(data as HeadlessKeyRow) };
}

/** Replaces an active key's Vault grants. The key value, mode and expiry stay the same. */
export async function updateHeadlessKeyGrants(input: {
  userId: string;
  keyId: string;
  vaultItemIds: unknown;
  vaultFolderIds: unknown;
}): Promise<{ previous: HeadlessKeyMetadata; metadata: HeadlessKeyMetadata } | null> {
  const current = await findActiveKey(input.userId, input.keyId);
  if (!current) return null;
  const grants = await authorizeVaultGrants({ ...input, creedId: current.creed_id });
  const { data, error } = await query(adminDb(), keys, "update", async (database, scope) => {
    const values = { vault_item_ids: grants.vaultItemIds, vault_folder_ids: grants.vaultFolderIds } as Partial<typeof keys.$inferInsert>;
    await authorizeValues(adminDb(), keys, "update", values);
    return database.update(keys).set(values)
      .where(and(scope, eq(keys.id, current.id), eq(keys.user_id, input.userId), usable())).returning(KEY_COLUMNS);
  }).then(maybeOne);
  if (error) throw new Error("Could not update headless access key.");
  return data ? { previous: toMetadata(current), metadata: toMetadata(data as HeadlessKeyRow) } : null;
}

export type KeyRotation =
  | { status: "rotated"; key: string; metadata: HeadlessKeyMetadata }
  | { status: "not-found" }
  | { status: "conflict" };

/**
 * Issues a new value for an active key and invalidates the old one at once.
 * Name, mode, expiry and Vault grants carry over. The update only applies to
 * the value read first, so of two concurrent rotations exactly one succeeds
 * and the other reports a conflict instead of returning an invalidated key.
 */
export async function rotateHeadlessAccessKey(input: {
  userId: string;
  keyId: string;
}): Promise<KeyRotation> {
  const { data: current, error: readError } = await query(adminDb(), keys, "select", (database, scope) => database.select({ key_hash: keys.key_hash }).from(keys)
    .where(and(scope, eq(keys.id, input.keyId), eq(keys.user_id, input.userId), usable()))).then(maybeOne);
  if (readError) throw new Error("Could not load headless access key.");
  if (!current) return { status: "not-found" };
  const previousHash = (current as { key_hash: string }).key_hash;
  const generated = createHeadlessKey();
  const { data, error } = await query(adminDb(), keys, "update", async (database, scope) => {
    const values = { key_prefix: generated.prefix, key_hash: generated.hash, last_used_at: null } as Partial<typeof keys.$inferInsert>;
    await authorizeValues(adminDb(), keys, "update", values);
    return database.update(keys).set(values)
      .where(and(scope, eq(keys.id, input.keyId), eq(keys.user_id, input.userId), usable(), eq(keys.key_hash, previousHash))).returning(KEY_COLUMNS);
  }).then(maybeOne);
  if (error) throw new Error("Could not rotate headless access key.");
  return data ? { status: "rotated", key: generated.key, metadata: toMetadata(data as HeadlessKeyRow) } : { status: "conflict" };
}

export async function revokeHeadlessAccessKey(input: {
  userId: string;
  keyId: string;
}): Promise<boolean> {
  const { data, error } = await query(adminDb(), keys, "update", async (database, scope) => {
    const values = { revoked_at: new Date().toISOString() } as Partial<typeof keys.$inferInsert>;
    await authorizeValues(adminDb(), keys, "update", values);
    return database.update(keys).set(values).where(and(scope, eq(keys.id, input.keyId), eq(keys.user_id, input.userId), isNull(keys.revoked_at))).returning({ id: keys.id });
  }).then(maybeOne);
  if (error) throw new Error("Could not revoke headless access key.");
  return Boolean(data);
}

export async function resolveHeadlessAccessKey(token: string): Promise<ResolvedHeadlessKey | null> {
  if (!isHeadlessKey(token)) return null;
  const admin = adminDb();
  const { data, error } = await query(admin, keys, "select", (database, scope) => database.select(KEY_COLUMNS).from(keys)
    .where(and(scope, eq(keys.key_hash, digestCredential(token))))).then(maybeOne);
  if (error || !data) return null;
  const row = data as HeadlessKeyRow;
  if (row.revoked_at || (row.expires_at && new Date(row.expires_at).getTime() <= Date.now())) {
    return null;
  }
  const role = await getStrapRole(admin, row.user_id, row.creed_id);
  if (!role) return null;

  await query(admin, keys, "update", (database, scope) => database.update(keys).set({ last_used_at: new Date().toISOString() }).where(and(scope, eq(keys.id, row.id))));

  return {
    keyId: row.id,
    userId: row.user_id,
    creedId: row.creed_id,
    clientName: row.name,
    mode: row.mode,
    vaultItemIds: row.vault_item_ids,
    vaultFolderIds: row.vault_folder_ids,
  };
}
