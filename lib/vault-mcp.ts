import "server-only";
import { countVaultFolderItems, findVaultFolder, listVaultFolders, listVaultItems } from "@/lib/api-key-vault";
import { listActiveHeadlessKeys } from "@/lib/headless-access";
import {
  buildVaultListing,
  canListVault,
  MAX_VAULT_LISTING_FOLDERS,
  MAX_VAULT_LISTING_KEYS,
  MAX_VAULT_LISTING_SCAN,
  parseVaultListingArgs,
  vaultFolderNotFound,
  VaultListingError,
  type VaultCallerGrant,
} from "@/lib/vault-tools";

/** Folder names quoted in a not-found error. */
const NAMES_IN_ERROR = 50;

export async function callVaultTool(
  args: unknown,
  access: { userId: string; strapId?: string; role?: string; profileType?: string; caller: VaultCallerGrant | null },
) {
  if (!access.strapId || !canListVault(access.role)) {
    throw new Error("The Vault is available to profile owners and Company owners and admins.");
  }
  const { userId, strapId } = access;
  // Malformed arguments must not fall through to an unfiltered listing.
  // Omitted arguments mean no filters; null, arrays and scalars are client errors.
  if (args !== undefined && (args === null || typeof args !== "object" || Array.isArray(args))) throw new VaultListingError("arguments must be an object.");
  // Reject oversized filters and bad cursors before reading the Vault.
  const { folder, query, cursor } = parseVaultListingArgs((args ?? {}) as Record<string, unknown>);
  // A folder filter is resolved across the whole profile, then only that
  // folder's secrets are read.
  const selected = folder ? await findVaultFolder(userId, strapId, folder) : null;
  if (folder && !selected) {
    const known = await listVaultFolders(userId, strapId, { limit: NAMES_IN_ERROR + 1 });
    throw vaultFolderNotFound(known.slice(0, NAMES_IN_ERROR), known.length > NAMES_IN_ERROR);
  }
  // Every read is bounded: one row past each limit shows that more exist.
  const [folderRows, keyRows, itemRows] = await Promise.all([
    selected ? Promise.resolve([selected]) : listVaultFolders(userId, strapId, { limit: MAX_VAULT_LISTING_FOLDERS + 1 }),
    listActiveHeadlessKeys(userId, strapId, MAX_VAULT_LISTING_KEYS + 1),
    listVaultItems(userId, strapId, { folderId: selected?.id, after: cursor ?? undefined, limit: MAX_VAULT_LISTING_SCAN + 1 }),
  ]);
  const folders = folderRows.slice(0, MAX_VAULT_LISTING_FOLDERS);
  // Counts only for the folders in this response.
  const itemCounts = await countVaultFolderItems(userId, strapId, folders.map((entry) => entry.id));
  return buildVaultListing({
    folders,
    items: itemRows.slice(0, MAX_VAULT_LISTING_SCAN),
    keys: keyRows.slice(0, MAX_VAULT_LISTING_KEYS),
    caller: access.caller,
    profileType: access.profileType,
    itemCounts,
    selectedFolder: selected ?? undefined,
    hasMoreRows: itemRows.length > MAX_VAULT_LISTING_SCAN,
    keysTruncated: keyRows.length > MAX_VAULT_LISTING_KEYS,
    foldersTruncated: folderRows.length > MAX_VAULT_LISTING_FOLDERS,
    folder,
    query,
  });
}
