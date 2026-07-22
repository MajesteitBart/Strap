import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseLikeClient } from "@/lib/supabase/types";
import { getCreedRole } from "@/lib/creed-membership";
import {
  createHeadlessKey,
  digestCredential,
  isHeadlessKey,
  type HeadlessKeyMode,
} from "@/lib/headless-access-shared";

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

function adminDb(): SupabaseLikeClient {
  return getSupabaseAdminClient() as unknown as SupabaseLikeClient;
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
  const { data, error } = await adminDb()
    .from("creed_headless_access_keys")
    .select("id, creed_id, user_id, name, key_prefix, mode, expires_at, revoked_at, last_used_at, created_at")
    .eq("user_id", userId)
    .eq("creed_id", creedId)
    .order("created_at", { ascending: false });
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
  const { data, error } = await adminDb()
    .from("creed_headless_access_keys")
    .insert({
      creed_id: input.creedId,
      user_id: input.userId,
      name: input.name,
      key_prefix: generated.prefix,
      key_hash: generated.hash,
      mode: input.mode,
      expires_at: input.expiresAt,
    })
    .select("id, creed_id, user_id, name, key_prefix, mode, expires_at, revoked_at, last_used_at, created_at")
    .single();
  if (error || !data) throw new Error("Could not create headless access key.");
  return { key: generated.key, metadata: toMetadata(data as HeadlessKeyRow) };
}

export async function revokeHeadlessAccessKey(input: {
  userId: string;
  keyId: string;
}): Promise<boolean> {
  const { data, error } = await adminDb()
    .from("creed_headless_access_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", input.keyId)
    .eq("user_id", input.userId)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw new Error("Could not revoke headless access key.");
  return Boolean(data);
}

export async function resolveHeadlessAccessKey(token: string): Promise<ResolvedHeadlessKey | null> {
  if (!isHeadlessKey(token)) return null;
  const admin = adminDb();
  const { data, error } = await admin
    .from("creed_headless_access_keys")
    .select("id, creed_id, user_id, name, key_prefix, mode, expires_at, revoked_at, last_used_at, created_at")
    .eq("key_hash", digestCredential(token))
    .maybeSingle();
  if (error || !data) return null;
  const row = data as HeadlessKeyRow;
  if (row.revoked_at || (row.expires_at && new Date(row.expires_at).getTime() <= Date.now())) {
    return null;
  }
  const role = await getCreedRole(admin, row.user_id, row.creed_id);
  if (!role) return null;

  void admin
    .from("creed_headless_access_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id)
    .then(undefined, () => {});

  return {
    keyId: row.id,
    userId: row.user_id,
    creedId: row.creed_id,
    clientName: row.name,
    mode: row.mode,
  };
}
