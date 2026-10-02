import * as tables from "@/db/schema/application";
import { auditRow, recordAuditEvent } from "@/lib/audit-log";
import { getDatabase } from "@/lib/db/client";
import {
  vaultCreate, vaultDelete, vaultFolderCreate, vaultFolderDelete, vaultFolderFind, vaultFolderItemCounts, vaultFolderList, vaultFolderUpdate, vaultGrantCoverage, vaultList, vaultReveal, vaultUpdate,
  type VaultCredential,
} from "@/lib/db/repositories/vault";
import "server-only";
export { VaultRepositoryError as VaultAccessError } from "@/lib/db/repositories/vault";
export type VaultItem = { id: string; creedId: string; folderId: string | null; name: string; description: string; createdBy: string; createdAt: string; updatedAt: string; lastAccessedAt: string | null };
export type VaultFolder = { id: string; strapId: string; name: string; description: string; createdAt: string; updatedAt: string };
function toItem(row: Awaited<ReturnType<typeof vaultCreate>>): VaultItem {
  return { id: row.id, creedId: row.creed_id, folderId: row.folder_id, name: row.name, description: row.description, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at, lastAccessedAt: row.last_accessed_at };
}
function toFolder(row: Awaited<ReturnType<typeof vaultFolderCreate>>): VaultFolder {
  return { id: row.id, strapId: row.strap_id, name: row.name, description: row.description, createdAt: row.created_at, updatedAt: row.updated_at };
}
export async function listVaultItems(userId: string, creedId: string, options: { folderId?: string; after?: { name: string; id: string }; limit?: number } = {}): Promise<VaultItem[]> {
  return (await vaultList(getDatabase(), { userId }, creedId, options)).map(toItem);
}
export async function listVaultFolders(userId: string, creedId: string, options: { limit?: number } = {}): Promise<VaultFolder[]> {
  return (await vaultFolderList(getDatabase(), { userId }, creedId, options)).map(toFolder);
}
export async function findVaultFolder(userId: string, creedId: string, nameOrId: string): Promise<VaultFolder | null> {
  const row = await vaultFolderFind(getDatabase(), { userId }, creedId, nameOrId);
  return row ? toFolder(row) : null;
}
export async function countVaultFolderItems(userId: string, creedId: string, folderIds: readonly string[]): Promise<Map<string, number>> {
  const rows = await vaultFolderItemCounts(getDatabase(), { userId }, creedId, folderIds);
  return new Map(rows.flatMap((row) => (row.folderId ? [[row.folderId, row.count] as const] : [])));
}
export async function createVaultItem(input: { userId: string; creedId: string; name: string; description: string; secret: string; folderId?: string | null; request: Request }): Promise<VaultItem> {
  const row = await vaultCreate(getDatabase(), { userId: input.userId }, input);
  await recordAuditEvent({ userId: input.userId, action: "vault.secret_created", metadata: { itemId: row.id, creedId: row.creed_id, folderId: row.folder_id }, request: input.request });
  return toItem(row);
}
export async function revealVaultItem(input: {
  userId: string;
  itemId: string;
  request: Request;
  /** Headless reveals must supply the resolved key's explicit item and folder grants. */
  credential?: VaultCredential;
}): Promise<{ item: VaultItem; secret: string }> {
  // The audit row is inserted on the reveal transaction, so it exists exactly
  // when the reveal was authorized and recorded.
  const result = await vaultReveal(getDatabase(), { userId: input.userId }, input.itemId, async (tx, creedId, grant) => {
    await tx.insert(tables.creed_audit_log).values(auditRow({
      userId: input.userId,
      action: "vault.secret_revealed",
      metadata: {
        itemId: input.itemId,
        creedId,
        ...(input.credential ? { keyId: input.credential.keyId, source: "headless" } : {}),
        ...(grant ? { folderId: grant.folderId } : {}),
      },
      request: input.request,
    }));
  }, input.credential);
  return { item: toItem(result.item), secret: result.secret };
}
export async function updateVaultItem(input: { userId: string; itemId: string; name: string; description: string; secret: string | null; folderId?: string | null; expectedFolderId?: string | null; request: Request }): Promise<VaultItem> {
  const { previous, updated } = await vaultUpdate(getDatabase(), { userId: input.userId }, input);
  // Only a request that asked for a move is audited as one; a concurrent move
  // by another session can also change the folder this edit returns.
  const moved = input.folderId !== undefined && previous.folder_id !== updated.folder_id;
  await recordAuditEvent({
    userId: input.userId,
    action: "vault.secret_updated",
    metadata: { itemId: updated.id, creedId: updated.creed_id, secretRotated: input.secret !== null, ...(moved ? { fromFolderId: previous.folder_id, toFolderId: updated.folder_id } : {}) },
    request: input.request,
  });
  return toItem(updated);
}
export async function deleteVaultItem(input: { userId: string; itemId: string; request: Request }): Promise<void> {
  const row = await vaultDelete(getDatabase(), { userId: input.userId }, input.itemId);
  await recordAuditEvent({ userId: input.userId, action: "vault.secret_deleted", metadata: { itemId: row.id, creedId: row.creed_id }, request: input.request });
}
export async function createVaultFolder(input: { userId: string; strapId: string; name: string; description: string; request: Request }): Promise<VaultFolder> {
  const row = await vaultFolderCreate(getDatabase(), { userId: input.userId }, input);
  await recordAuditEvent({ userId: input.userId, action: "vault.folder_created", metadata: { folderId: row.id, creedId: row.strap_id }, request: input.request });
  return toFolder(row);
}
export async function updateVaultFolder(input: { userId: string; folderId: string; name: string; description: string; expectedUpdatedAt: string; request: Request }): Promise<VaultFolder> {
  const row = await vaultFolderUpdate(getDatabase(), { userId: input.userId }, input);
  await recordAuditEvent({ userId: input.userId, action: "vault.folder_updated", metadata: { folderId: row.id, creedId: row.strap_id }, request: input.request });
  return toFolder(row);
}
export async function deleteVaultFolder(input: { userId: string; folderId: string; expectedItemIds: readonly string[]; request: Request }): Promise<{ movedItemCount: number }> {
  const { folder, movedItemCount } = await vaultFolderDelete(getDatabase(), { userId: input.userId }, input.folderId, input.expectedItemIds);
  await recordAuditEvent({ userId: input.userId, action: "vault.folder_deleted", metadata: { folderId: folder.id, creedId: folder.strap_id, movedItemCount }, request: input.request });
  return { movedItemCount };
}
/** Number of items a headless key can reveal right now. Never returns item data. */
export async function countRevealableVaultItems(userId: string, credential: Pick<VaultCredential, "creedId" | "vaultItemIds" | "vaultFolderIds">): Promise<number> {
  return vaultGrantCoverage(getDatabase(), { userId }, credential);
}
