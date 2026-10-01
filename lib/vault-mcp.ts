import "server-only";
import { listVaultFolders, listVaultItems } from "@/lib/api-key-vault";
import { listHeadlessKeys } from "@/lib/headless-access";
import { buildVaultListing, canListVault, parseVaultListingArgs, type VaultCallerGrant } from "@/lib/vault-tools";

export async function callVaultTool(
  args: Record<string, unknown>,
  access: { userId: string; strapId?: string; role?: string; caller: VaultCallerGrant | null },
) {
  if (!access.strapId || !canListVault(access.role)) {
    throw new Error("The Vault is available to profile owners and Company owners and admins.");
  }
  // Reject oversized filters before loading the whole Vault.
  const filters = parseVaultListingArgs(args);
  const [folders, items, keys] = await Promise.all([
    listVaultFolders(access.userId, access.strapId),
    listVaultItems(access.userId, access.strapId),
    listHeadlessKeys(access.userId, access.strapId),
  ]);
  const now = Date.now();
  const activeKeys = keys.filter((key) => !key.revokedAt && (!key.expiresAt || new Date(key.expiresAt).getTime() > now));
  return buildVaultListing({ folders, items, keys: activeKeys, caller: access.caller, ...filters });
}
