import { recordAuditEvent, recordRequiredAuditEvent } from "@/lib/audit-log";
import { getDatabase } from "@/lib/db/client";
import { vaultCreate, vaultDelete, vaultList, vaultReveal, vaultUpdate } from "@/lib/db/repositories/vault";
import "server-only";
export { VaultRepositoryError as VaultAccessError } from "@/lib/db/repositories/vault";
export type VaultItem = { id: string; creedId: string; name: string; description: string; createdBy: string; createdAt: string; updatedAt: string; lastAccessedAt: string | null };
function toItem(row: Awaited<ReturnType<typeof vaultCreate>>): VaultItem {
  return { id: row.id, creedId: row.creed_id, name: row.name, description: row.description, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at, lastAccessedAt: row.last_accessed_at };
}
export async function listVaultItems(userId: string, creedId: string): Promise<VaultItem[]> {
  return (await vaultList(getDatabase(), { userId }, creedId)).map(toItem);
}
export async function createVaultItem(input: { userId: string; creedId: string; name: string; description: string; secret: string; request: Request }): Promise<VaultItem> {
  const row = await vaultCreate(getDatabase(), { userId: input.userId }, input);
  await recordAuditEvent({ userId: input.userId, action: "vault.secret_created", metadata: { itemId: row.id, creedId: row.creed_id }, request: input.request });
  return toItem(row);
}
export async function revealVaultItem(input: { userId: string; itemId: string; request: Request }): Promise<{ item: VaultItem; secret: string }> {
  const result = await vaultReveal(getDatabase(), { userId: input.userId }, input.itemId, creedId => recordRequiredAuditEvent({ userId: input.userId, action: "vault.secret_revealed", metadata: { itemId: input.itemId, creedId }, request: input.request }));
  return { item: toItem(result.item), secret: result.secret };
}
export async function updateVaultItem(input: { userId: string; itemId: string; name: string; description: string; secret: string | null; request: Request }): Promise<VaultItem> {
  const row = await vaultUpdate(getDatabase(), { userId: input.userId }, input);
  await recordAuditEvent({ userId: input.userId, action: "vault.secret_updated", metadata: { itemId: row.id, creedId: row.creed_id, secretRotated: input.secret !== null }, request: input.request });
  return toItem(row);
}
export async function deleteVaultItem(input: { userId: string; itemId: string; request: Request }): Promise<void> {
  const row = await vaultDelete(getDatabase(), { userId: input.userId }, input.itemId);
  await recordAuditEvent({ userId: input.userId, action: "vault.secret_deleted", metadata: { itemId: row.id, creedId: row.creed_id }, request: input.request });
}
