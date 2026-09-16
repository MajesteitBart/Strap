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
import { and, desc, eq, isNull } from "drizzle-orm";
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
};

export type ResolvedHeadlessKey = {
  keyId: string;
  userId: string;
  creedId: string;
  clientName: string;
  mode: HeadlessKeyMode;
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
  };
}

export async function listHeadlessKeys(userId: string, creedId: string): Promise<HeadlessKeyMetadata[]> {
  const { data, error } = await query(adminDb(), tables.creed_headless_access_keys, "select", (database, scope) => database.select({ id: tables.creed_headless_access_keys.id, creed_id: tables.creed_headless_access_keys.creed_id, user_id: tables.creed_headless_access_keys.user_id, name: tables.creed_headless_access_keys.name, key_prefix: tables.creed_headless_access_keys.key_prefix, mode: tables.creed_headless_access_keys.mode, expires_at: tables.creed_headless_access_keys.expires_at, revoked_at: tables.creed_headless_access_keys.revoked_at, last_used_at: tables.creed_headless_access_keys.last_used_at, created_at: tables.creed_headless_access_keys.created_at }).from(tables.creed_headless_access_keys).where(and(scope, eq(tables.creed_headless_access_keys.user_id, userId), eq(tables.creed_headless_access_keys.creed_id, creedId))).orderBy(desc(tables.creed_headless_access_keys.created_at)));
  if (error) throw new Error("Could not list headless access keys.");
  return ((data as HeadlessKeyRow[] | null) ?? []).map(toMetadata);
}

export async function createHeadlessAccessKey(input: {
  userId: string;
  creedId: string;
  name: string;
  mode: HeadlessKeyMode;
  expiresAt: string | null;
}): Promise<{ key: string; metadata: HeadlessKeyMetadata }> {
  const generated = createHeadlessKey();
  const { data, error } = await query(adminDb(), tables.creed_headless_access_keys, "insert", async (database, _scope) => {
    const values = {
      creed_id: input.creedId,
      user_id: input.userId,
      name: input.name,
      key_prefix: generated.prefix,
      key_hash: generated.hash,
      mode: input.mode,
      expires_at: input.expiresAt,
    } as typeof tables.creed_headless_access_keys.$inferInsert;
    await authorizeValues(adminDb(), tables.creed_headless_access_keys, "insert", values);
    return database.insert(tables.creed_headless_access_keys).values(values).returning({ id: tables.creed_headless_access_keys.id, creed_id: tables.creed_headless_access_keys.creed_id, user_id: tables.creed_headless_access_keys.user_id, name: tables.creed_headless_access_keys.name, key_prefix: tables.creed_headless_access_keys.key_prefix, mode: tables.creed_headless_access_keys.mode, expires_at: tables.creed_headless_access_keys.expires_at, revoked_at: tables.creed_headless_access_keys.revoked_at, last_used_at: tables.creed_headless_access_keys.last_used_at, created_at: tables.creed_headless_access_keys.created_at });
  }).then(exactlyOne);
  if (error || !data) throw new Error("Could not create headless access key.");
  return { key: generated.key, metadata: toMetadata(data as HeadlessKeyRow) };
}

export async function revokeHeadlessAccessKey(input: {
  userId: string;
  keyId: string;
}): Promise<boolean> {
  const { data, error } = await query(adminDb(), tables.creed_headless_access_keys, "update", async (database, scope) => {
    const values = { revoked_at: new Date().toISOString() } as Partial<typeof tables.creed_headless_access_keys.$inferInsert>;
    await authorizeValues(adminDb(), tables.creed_headless_access_keys, "update", values);
    return database.update(tables.creed_headless_access_keys).set(values).where(and(scope, eq(tables.creed_headless_access_keys.id, input.keyId), eq(tables.creed_headless_access_keys.user_id, input.userId), isNull(tables.creed_headless_access_keys.revoked_at))).returning({ id: tables.creed_headless_access_keys.id });
  }).then(maybeOne);
  if (error) throw new Error("Could not revoke headless access key.");
  return Boolean(data);
}

export async function resolveHeadlessAccessKey(token: string): Promise<ResolvedHeadlessKey | null> {
  if (!isHeadlessKey(token)) return null;
  const admin = adminDb();
  const { data, error } = await query(admin, tables.creed_headless_access_keys, "select", (database, scope) => database.select({ id: tables.creed_headless_access_keys.id, creed_id: tables.creed_headless_access_keys.creed_id, user_id: tables.creed_headless_access_keys.user_id, name: tables.creed_headless_access_keys.name, key_prefix: tables.creed_headless_access_keys.key_prefix, mode: tables.creed_headless_access_keys.mode, expires_at: tables.creed_headless_access_keys.expires_at, revoked_at: tables.creed_headless_access_keys.revoked_at, last_used_at: tables.creed_headless_access_keys.last_used_at, created_at: tables.creed_headless_access_keys.created_at }).from(tables.creed_headless_access_keys).where(and(scope, eq(tables.creed_headless_access_keys.key_hash, digestCredential(token))))).then(maybeOne);
  if (error || !data) return null;
  const row = data as HeadlessKeyRow;
  if (row.revoked_at || (row.expires_at && new Date(row.expires_at).getTime() <= Date.now())) {
    return null;
  }
  const role = await getStrapRole(admin, row.user_id, row.creed_id);
  if (!role) return null;

  await query(admin, tables.creed_headless_access_keys, "update", (database, scope) => database.update(tables.creed_headless_access_keys).set({ last_used_at: new Date().toISOString() }).where(and(scope, eq(tables.creed_headless_access_keys.id, row.id))));

  return {
    keyId: row.id,
    userId: row.user_id,
    creedId: row.creed_id,
    clientName: row.name,
    mode: row.mode,
  };
}
