// Vault discovery for connected agents: metadata and references only, never values.
import { matchesVaultQuery, vaultEnvName, vaultSchemaLine } from "../packages/strap/src/vault/schema.ts";
import { vaultGrantCovers } from "./vault-grants.ts";

export const VAULT_TOOLS = [
  {
    name: "strap_list_vault_items",
    description:
      "List Vault folders and secret metadata in the connected profile: names, descriptions, folders, secret:// references, a suggested .env.schema line for Varlock, and which of your API keys can reveal each secret. Never returns secret values. Filter by folder (name or id) or by words from the name or description.",
    inputSchema: {
      type: "object",
      properties: {
        folder: { type: "string", description: "Folder name (case-insensitive) or id." },
        query: { type: "string", description: "Words to match against secret names and descriptions." },
      },
    },
  },
] as const;

/** The Vault is limited to personal owners and Company owners/admins. */
export function canListVault(role: string | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function vaultToolsFor(strapId: string | undefined, role: string | undefined) {
  return strapId && canListVault(role) ? [...VAULT_TOOLS] : [];
}

type Folder = { id: string; name: string; description: string };
type Item = { id: string; folderId: string | null; name: string; description: string; updatedAt: string };
type Key = { id: string; name: string; prefix: string; vaultItemIds: string[]; vaultFolderIds: string[] };
/** Present only when the caller authenticated with a headless key. */
export type VaultCallerGrant = { keyId: string; vaultItemIds: readonly string[]; vaultFolderIds: readonly string[] };

export class VaultListingError extends Error {}

export function buildVaultListing(input: {
  folders: Folder[];
  items: Item[];
  keys: Key[];
  caller: VaultCallerGrant | null;
  folder?: unknown;
  query?: unknown;
}) {
  const folderArg = typeof input.folder === "string" ? input.folder.trim() : "";
  const queryArg = typeof input.query === "string" ? input.query.trim() : "";
  const selected = folderArg
    ? input.folders.find((folder) => folder.id === folderArg.toLowerCase() || folder.name.toLowerCase() === folderArg.toLowerCase())
    : undefined;
  if (folderArg && !selected) {
    const names = input.folders.map((folder) => folder.name);
    throw new VaultListingError(`Folder not found. Available folders: ${names.length ? names.join(", ") : "none"}.`);
  }
  const folderById = new Map(input.folders.map((folder) => [folder.id, folder]));
  const items = input.items
    .filter((item) => !selected || item.folderId === selected.id)
    .filter((item) => !queryArg || matchesVaultQuery(item, queryArg))
    .map((item) => {
      const reference = `secret://${item.id}`;
      const envName = vaultEnvName(item.name);
      const folder = item.folderId ? folderById.get(item.folderId) : undefined;
      const covered = { id: item.id, folderId: item.folderId };
      return {
        id: item.id,
        reference,
        name: item.name,
        description: item.description,
        folder: folder ? { id: folder.id, name: folder.name } : null,
        updatedAt: item.updatedAt,
        envName,
        schemaLine: vaultSchemaLine({ envName, reference }),
        revealableBy: input.keys.filter((key) => vaultGrantCovers(key, covered)).map((key) => ({ id: key.id, name: key.name, prefix: key.prefix })),
        ...(input.caller ? { grantedToThisKey: vaultGrantCovers(input.caller, covered) } : {}),
      };
    });
  const folders = input.folders
    .filter((folder) => !selected || folder.id === selected.id)
    .map((folder) => ({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      itemCount: input.items.filter((item) => item.folderId === folder.id).length,
      ...(input.caller ? { grantedToThisKey: input.caller.vaultFolderIds.includes(folder.id) } : {}),
    }));
  return {
    folders,
    items,
    note: "Values are never returned here. Add schemaLine to .env.schema and resolve it with Varlock and a Strap API key that can reveal the secret.",
  };
}
