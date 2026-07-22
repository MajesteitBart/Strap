import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseLikeClient } from "@/lib/supabase/types";
import { listUserCreeds } from "@/lib/creed-membership";
import { recordAuditEvent, recordRequiredAuditEvent } from "@/lib/audit-log";

type VaultItemRow = {
  id: string;
  creed_id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
};

export type VaultItem = {
  id: string;
  creedId: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string | null;
};

type RpcResult = { data: unknown; error: { message: string } | null };
type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult> };

export class VaultAccessError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function adminDb(): SupabaseLikeClient {
  return getSupabaseAdminClient() as unknown as SupabaseLikeClient;
}

function rpcDb(): RpcClient {
  return getSupabaseAdminClient() as unknown as RpcClient;
}

function toItem(row: VaultItemRow): VaultItem {
  return {
    id: row.id,
    creedId: row.creed_id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastAccessedAt: row.last_accessed_at,
  };
}

async function requireVaultCreedAccess(userId: string, creedId: string): Promise<void> {
  const match = (await listUserCreeds(adminDb(), userId)).find((creed) => creed.id === creedId);
  if (!match) throw new VaultAccessError("Forbidden", 403);
  if (match.type === "company" && match.role !== "owner" && match.role !== "admin") {
    throw new VaultAccessError("Vault access requires a company owner or admin.", 403);
  }
}

async function requireVaultItemAccess(userId: string, itemId: string): Promise<VaultItemRow> {
  const { data, error } = await adminDb()
    .from("creed_vault_items")
    .select("id, creed_id, name, description, created_by, created_at, updated_at, last_accessed_at")
    .eq("id", itemId)
    .maybeSingle();
  if (error) throw new VaultAccessError("Could not load Vault item.", 500);
  if (!data) throw new VaultAccessError("Vault item not found.", 404);
  const row = data as VaultItemRow;
  await requireVaultCreedAccess(userId, row.creed_id);
  return row;
}

export async function listVaultItems(userId: string, creedId: string): Promise<VaultItem[]> {
  await requireVaultCreedAccess(userId, creedId);
  const { data, error } = await adminDb()
    .from("creed_vault_items")
    .select("id, creed_id, name, description, created_by, created_at, updated_at, last_accessed_at")
    .eq("creed_id", creedId)
    .order("name", { ascending: true });
  if (error) throw new VaultAccessError("Could not list Vault items.", 500);
  return ((data as VaultItemRow[] | null) ?? []).map(toItem);
}

export async function createVaultItem(input: {
  userId: string;
  creedId: string;
  name: string;
  description: string;
  secret: string;
  request: Request;
}): Promise<VaultItem> {
  await requireVaultCreedAccess(input.userId, input.creedId);
  const { data, error } = await rpcDb().rpc("creed_vault_create_secret", {
    p_creed_id: input.creedId,
    p_created_by: input.userId,
    p_name: input.name,
    p_description: input.description,
    p_secret: input.secret,
  });
  if (error || typeof data !== "string") {
    throw new VaultAccessError("Could not create Vault item.", 500);
  }
  const row = await requireVaultItemAccess(input.userId, data);
  void recordAuditEvent({
    userId: input.userId,
    action: "vault.secret_created",
    metadata: { itemId: row.id, creedId: row.creed_id },
    request: input.request,
  });
  return toItem(row);
}

export async function revealVaultItem(input: {
  userId: string;
  itemId: string;
  request: Request;
}): Promise<{ item: VaultItem; secret: string }> {
  const metadata = await requireVaultItemAccess(input.userId, input.itemId);
  const { data, error } = await rpcDb().rpc("creed_vault_reveal_secret", {
    p_item_id: input.itemId,
  });
  const rows = data as Array<{
    item_id: string;
    item_name: string;
    item_description: string;
    secret_value: string;
    item_updated_at: string;
  }> | null;
  const revealed = rows?.[0];
  if (error || !revealed || typeof revealed.secret_value !== "string") {
    throw new VaultAccessError("Could not reveal Vault item.", 500);
  }

  try {
    await recordRequiredAuditEvent({
      userId: input.userId,
      action: "vault.secret_revealed",
      metadata: { itemId: input.itemId, creedId: metadata.creed_id },
      request: input.request,
    });
  } catch {
    throw new VaultAccessError("Vault reveal audit is unavailable.", 503);
  }

  return {
    item: toItem({
      ...metadata,
      name: revealed.item_name,
      description: revealed.item_description,
      updated_at: revealed.item_updated_at,
      last_accessed_at: new Date().toISOString(),
    }),
    secret: revealed.secret_value,
  };
}

export async function updateVaultItem(input: {
  userId: string;
  itemId: string;
  name: string;
  description: string;
  secret: string | null;
  request: Request;
}): Promise<VaultItem> {
  const metadata = await requireVaultItemAccess(input.userId, input.itemId);
  const { data, error } = await rpcDb().rpc("creed_vault_update_secret", {
    p_item_id: input.itemId,
    p_name: input.name,
    p_description: input.description,
    p_secret: input.secret,
  });
  if (error || data !== true) throw new VaultAccessError("Could not update Vault item.", 500);
  const updated = await requireVaultItemAccess(input.userId, input.itemId);
  void recordAuditEvent({
    userId: input.userId,
    action: "vault.secret_updated",
    metadata: { itemId: input.itemId, creedId: metadata.creed_id, secretRotated: input.secret !== null },
    request: input.request,
  });
  return toItem(updated);
}

export async function deleteVaultItem(input: {
  userId: string;
  itemId: string;
  request: Request;
}): Promise<void> {
  const metadata = await requireVaultItemAccess(input.userId, input.itemId);
  const { data, error } = await rpcDb().rpc("creed_vault_delete_secret", {
    p_item_id: input.itemId,
  });
  if (error || data !== true) throw new VaultAccessError("Could not delete Vault item.", 500);
  void recordAuditEvent({
    userId: input.userId,
    action: "vault.secret_deleted",
    metadata: { itemId: input.itemId, creedId: metadata.creed_id },
    request: input.request,
  });
}
