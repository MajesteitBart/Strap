import "server-only";
import { listVaultFolders, listVaultItems } from "@/lib/api-key-vault";
import { listHeadlessKeys } from "@/lib/headless-access";
import { buildVaultListing, canListVault, parseVaultListingArgs, VaultListingError, type VaultCallerGrant } from "@/lib/vault-tools";

export async function callVaultTool(
  args: unknown,
  access: { userId: string; strapId?: string; role?: string; profileType?: string; caller: VaultCallerGrant | null },
) {
  if (!access.strapId || !canListVault(access.role)) {
    throw new Error("The Vault is available to profile owners and Company owners and admins.");
  }
  // Malformed arguments must not fall through to an unfiltered listing.
  // Omitted arguments mean no filters; null, arrays and scalars are client errors.
  if (args !== undefined && (args === null || typeof args !== "object" || Array.isArray(args))) throw new VaultListingError("arguments must be an object.");
  // Reject oversized filters before loading the whole Vault.
  const filters = parseVaultListingArgs((args ?? {}) as Record<string, unknown>);
  const [folders, items, keys] = await Promise.all([
    listVaultFolders(access.userId, access.strapId),
    listVaultItems(access.userId, access.strapId),
    listHeadlessKeys(access.userId, access.strapId),
  ]);
  const now = Date.now();
  const activeKeys = keys.filter((key) => !key.revokedAt && (!key.expiresAt || new Date(key.expiresAt).getTime() > now));
  return buildVaultListing({ folders, items, keys: activeKeys, caller: access.caller, profileType: access.profileType, ...filters });
}
