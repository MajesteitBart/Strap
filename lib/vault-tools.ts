// Vault discovery for connected agents: metadata and references only, never values.
import { terminalText, vaultEnvName, vaultQueryMatcher, vaultSchemaLine } from "../packages/strap/src/vault/schema.ts";

export const VAULT_TOOLS = [
  {
    name: "strap_list_vault_items",
    description:
      "List Vault folders and secret metadata in the connected profile: names, descriptions, folders, secret:// references, a suggested .env.schema line for Varlock, and which of your API keys can reveal each secret. Never returns secret values. schemaLine is null when two listed secrets map to the same variable name (envNameConflict); pick distinct names for those. Filter by folder (name or id) or by words from the name or description. Call it on its own, not in a batch.",
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

/** Longest accepted folder or query argument. Folder names are at most 120 characters. */
export const MAX_VAULT_FILTER_LENGTH = 200;
/** Keys listed per secret; revealableByCount carries the full number. */
export const MAX_REVEALABLE_BY = 20;

/** Validates filter arguments before any Vault data is loaded. */
export function parseVaultListingArgs(args: { folder?: unknown; query?: unknown }): { folder: string; query: string } {
  const folder = typeof args.folder === "string" ? args.folder.trim() : "";
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (folder.length > MAX_VAULT_FILTER_LENGTH || query.length > MAX_VAULT_FILTER_LENGTH) {
    throw new VaultListingError(`folder and query are limited to ${MAX_VAULT_FILTER_LENGTH} characters.`);
  }
  return { folder, query };
}

export function buildVaultListing(input: {
  folders: Folder[];
  items: Item[];
  keys: Key[];
  caller: VaultCallerGrant | null;
  folder?: unknown;
  query?: unknown;
}) {
  const { folder: folderArg, query: queryArg } = parseVaultListingArgs(input);
  // An exact ID wins over a folder that happens to be named like another folder's ID.
  const selected = folderArg
    ? input.folders.find((folder) => folder.id === folderArg.toLowerCase()) ??
      input.folders.find((folder) => folder.name.toLowerCase() === folderArg.toLowerCase())
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
  const folderKeySets = new Map<string, Set<Key>>();
  const folderKeySet = (id: string) => {
    let set = folderKeySets.get(id);
    if (!set) folderKeySets.set(id, set = new Set(keysByFolder.get(id) ?? []));
    return set;
  };
  // Both lists are already in key order. Merge only as many as are shown, so
  // the cost per item depends on its direct grants, not on every folder key.
  const revealers = (item: Item) => {
    const direct = keysByItem.get(item.id) ?? [];
    const viaFolder = item.folderId ? keysByFolder.get(item.folderId) ?? [] : [];
    const folderSet = item.folderId ? folderKeySet(item.folderId) : new Set<Key>();
    const shown: Key[] = [];
    let d = 0, f = 0;
    while (shown.length < MAX_REVEALABLE_BY && (d < direct.length || f < viaFolder.length)) {
      const next = f >= viaFolder.length || (d < direct.length && (keyOrder.get(direct[d]!) ?? 0) <= (keyOrder.get(viaFolder[f]!) ?? 0)) ? direct[d++]! : viaFolder[f++]!;
      if (shown[shown.length - 1] !== next) shown.push(next);
    }
    return { shown, total: folderSet.size + direct.filter((key) => !folderSet.has(key)).length };
  };
  const matches = vaultQueryMatcher(queryArg);
  const listed = input.items
    .filter((item) => !selected || item.folderId === selected.id)
    .filter((item) => !queryArg || matches(item));
  // Names like "deploy-key" and "deploy key" share one variable name. Copying
  // both suggestions would define it twice, so colliding items get no line.
  const envNameUses = new Map<string, number>();
  for (const item of listed) envNameUses.set(vaultEnvName(item.name), (envNameUses.get(vaultEnvName(item.name)) ?? 0) + 1);
  const items = listed
    .map((item) => {
      const reference = `secret://${item.id}`;
      const envName = vaultEnvName(item.name);
      const envNameConflict = (envNameUses.get(envName) ?? 0) > 1;
      const folder = item.folderId ? folderById.get(item.folderId) : undefined;
      const { shown, total } = revealers(item);
      return {
        id: item.id,
        reference,
        name: item.name,
        description: item.description,
        folder: folder ? { id: folder.id, name: folder.name } : null,
        updatedAt: item.updatedAt,
        envName,
        // null when another listed secret maps to the same variable name; choose distinct names.
        schemaLine: envNameConflict ? null : vaultSchemaLine({ envName, reference }),
        envNameConflict,
        // Up to MAX_REVEALABLE_BY keys in their original order; the count covers all.
        revealableBy: shown.map((key) => ({ id: key.id, name: key.name, prefix: key.prefix })),
        revealableByCount: total,
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
