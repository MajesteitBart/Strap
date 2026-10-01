// Vault discovery for connected agents: metadata and references only, never values.
import { matchesVaultQuery, terminalText, vaultEnvName, vaultSchemaLine } from "../packages/strap/src/vault/schema.ts";

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

/**
 * A listing loads every folder, item and key in the profile. Batches would
 * multiply that work behind one rate-limit token, so listings go alone.
 */
export function isVaultListingBatch(requests: unknown[]): boolean {
  return requests.length > 1 && requests.some((request) => {
    if (!request || typeof request !== "object") return false;
    const { method, params } = request as { method?: unknown; params?: unknown };
    return method === "tools/call" && !!params && typeof params === "object" &&
      VAULT_TOOLS.some((tool) => tool.name === (params as { name?: unknown }).name);
  });
}

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
    // Names come from other managers and may reach a terminal through generic tool errors.
    const names = input.folders.map((folder) => JSON.stringify(terminalText(folder.name)));
    throw new VaultListingError(`Folder not found. Available folders: ${names.length ? names.join(", ") : "none"}.`);
  }
  const folderById = new Map(input.folders.map((folder) => [folder.id, folder]));
  // Index grants once, so a listing is linear in items plus grants rather
  // than items times keys.
  const keysByItem = new Map<string, Key[]>();
  const keysByFolder = new Map<string, Key[]>();
  const add = (index: Map<string, Key[]>, id: string, key: Key) => {
    const list = index.get(id);
    if (list) list.push(key); else index.set(id, [key]);
  };
  const keyOrder = new Map(input.keys.map((key, position) => [key, position]));
  for (const key of input.keys) {
    for (const id of new Set(key.vaultItemIds)) add(keysByItem, id, key);
    for (const id of new Set(key.vaultFolderIds)) add(keysByFolder, id, key);
  }
  const callerItems = new Set(input.caller?.vaultItemIds ?? []);
  const callerFolders = new Set(input.caller?.vaultFolderIds ?? []);
  const itemCounts = new Map<string, number>();
  for (const item of input.items) if (item.folderId) itemCounts.set(item.folderId, (itemCounts.get(item.folderId) ?? 0) + 1);
  const items = input.items
    .filter((item) => !selected || item.folderId === selected.id)
    .filter((item) => !queryArg || matchesVaultQuery(item, queryArg))
    .map((item) => {
      const reference = `secret://${item.id}`;
      const envName = vaultEnvName(item.name);
      const folder = item.folderId ? folderById.get(item.folderId) : undefined;
      const revealing = new Set([...(keysByItem.get(item.id) ?? []), ...(item.folderId ? keysByFolder.get(item.folderId) ?? [] : [])]);
      return {
        id: item.id,
        reference,
        name: item.name,
        description: item.description,
        folder: folder ? { id: folder.id, name: folder.name } : null,
        updatedAt: item.updatedAt,
        envName,
        schemaLine: vaultSchemaLine({ envName, reference }),
        // Keep the keys' original order for stable output.
        revealableBy: [...revealing].sort((a, b) => (keyOrder.get(a) ?? 0) - (keyOrder.get(b) ?? 0)).map((key) => ({ id: key.id, name: key.name, prefix: key.prefix })),
        ...(input.caller ? { grantedToThisKey: callerItems.has(item.id) || (item.folderId !== null && callerFolders.has(item.folderId)) } : {}),
      };
    });
  const folders = input.folders
    .filter((folder) => !selected || folder.id === selected.id)
    .map((folder) => ({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      itemCount: itemCounts.get(folder.id) ?? 0,
      ...(input.caller ? { grantedToThisKey: callerFolders.has(folder.id) } : {}),
    }));
  return {
    folders,
    items,
    note: "Values are never returned here. Add schemaLine to .env.schema and resolve it with Varlock and a Strap API key that can reveal the secret.",
  };
}
