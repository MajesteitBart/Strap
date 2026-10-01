/** Explicit item and folder grants are independent of a key's context-editing mode. */
export const MAX_VAULT_ITEM_GRANTS = 100;
export const MAX_VAULT_FOLDER_GRANTS = 100;
/** Per-key reveal ceiling. A key covering up to 1,000 secrets can load and run within a minute. */
export const MAX_VAULT_REVEALS_PER_MINUTE = 2_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseIdList(value: unknown, max: number): string[] | undefined {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) return undefined;
  if (!value.every((id): id is string => typeof id === "string" && UUID.test(id))) return undefined;
  return [...new Set(value.map((id) => id.toLowerCase()))];
}

export function parseVaultItemGrants(value: unknown): string[] | undefined {
  return parseIdList(value, MAX_VAULT_ITEM_GRANTS);
}

export function parseVaultFolderGrants(value: unknown): string[] | undefined {
  return parseIdList(value, MAX_VAULT_FOLDER_GRANTS);
}

/** Folder names are selected in CLI commands and printed in schema comments, so they stay on one line. */
export function isVaultFolderName(name: string): boolean {
  return name.length >= 1 && name.length <= 120 && !/[\u0000-\u001f\u007f]/.test(name);
}

/** Absent means "leave unchanged"; null means "no folder". */
export function parseVaultFolderId(value: unknown): string | null | undefined | false {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return typeof value === "string" && UUID.test(value) ? value.toLowerCase() : false;
}

export function parseVaultReference(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.startsWith("secret://") ? value.slice("secret://".length) : value;
  return UUID.test(id) ? id.toLowerCase() : null;
}

/** A key reveals an item it was granted directly or through the item's current folder. */
export function vaultGrantCovers(
  grant: { vaultItemIds: readonly string[]; vaultFolderIds: readonly string[] },
  item: { id: string; folderId: string | null },
): boolean {
  return grant.vaultItemIds.includes(item.id) || (item.folderId !== null && grant.vaultFolderIds.includes(item.folderId));
}
