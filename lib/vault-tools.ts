// Vault discovery for connected agents: metadata and references only, never values.
import { isProcessControlEnvName, terminalText, vaultEnvName, vaultQueryMatcher, vaultSchemaLine } from "../packages/strap/src/vault/schema.ts";

export const VAULT_TOOLS = [
  {
    name: "strap_list_vault_items",
    description:
      "List Vault folders and secret metadata in the connected profile: names, descriptions, folders, secret:// references, a suggested .env.schema line for Varlock, and which of your API keys can reveal each secret. Never returns secret values. schemaLine is null when two listed secrets map to the same variable name (envNameConflict) or when the name controls process startup, such as NODE_OPTIONS or PATH (envNameReserved), or, in a Company profile, because another owner or admin may have chosen the name (envNameNeedsReview). Never write those lines without the user's explicit approval of the variable name. Filter by folder (name or id) or by words from the name or description. Returns at most 500 secrets per call; when truncated is true, call again with cursor set to nextCursor to continue. keysTruncated means revealableByCount may be a lower bound, and envNameConflict covers only the secrets in one response. Call it on its own, not in a batch.",
    inputSchema: {
      type: "object",
      properties: {
        folder: { type: "string", description: "Folder name (case-insensitive) or id." },
        query: { type: "string", description: "Words to match against secret names and descriptions." },
        cursor: { type: "string", description: "nextCursor from the previous call, to continue a truncated listing." },
      },
    },
  },
] as const;

/**
 * A listing reads up to the scan limits of folders, items and keys. Batches
 * would multiply that work behind one rate-limit token, so listings go alone.
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
/** One listing returns at most this many secrets and reads at most the scan limits below. */
export const MAX_VAULT_LISTING_ITEMS = 500;
export const MAX_VAULT_LISTING_SCAN = 5_000;
export const MAX_VAULT_LISTING_FOLDERS = 1_000;
export const MAX_VAULT_LISTING_KEYS = 1_000;
/** Keys listed per secret; revealableByCount carries the full number. */
export const MAX_REVEALABLE_BY = 20;

/** Validates filter arguments before any Vault data is loaded. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Where the next page starts: the id of the last secret already returned or read. */
export type VaultCursor = { id: string };

export function encodeVaultCursor(item: VaultCursor): string {
  return Buffer.from(JSON.stringify([item.id]), "utf8").toString("base64url");
}

function decodeVaultCursor(value: string): VaultCursor {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === "string" && UUID.test(parsed[0])) {
      return { id: parsed[0].toLowerCase() };
    }
  } catch {
    // Fall through to the client error below.
  }
  throw new VaultListingError("cursor is not valid; pass nextCursor from the previous listing.");
}

export function parseVaultListingArgs(args: { folder?: unknown; query?: unknown; cursor?: unknown }): { folder: string; query: string; cursor: VaultCursor | null } {
  // Absent, null and "" mean no filter. Any other non-string is a client error:
  // treating it as empty would silently widen a scoped lookup to the whole Vault.
  for (const [name, value] of Object.entries({ folder: args.folder, query: args.query, cursor: args.cursor })) {
    if (value !== undefined && value !== null && typeof value !== "string") throw new VaultListingError(`${name} must be a string.`);
  }
  const folder = typeof args.folder === "string" ? args.folder.trim() : "";
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (folder.length > MAX_VAULT_FILTER_LENGTH || query.length > MAX_VAULT_FILTER_LENGTH) {
    throw new VaultListingError(`folder and query are limited to ${MAX_VAULT_FILTER_LENGTH} characters.`);
  }
  const cursorText = typeof args.cursor === "string" ? args.cursor.trim() : "";
  if (cursorText.length > 256) throw new VaultListingError("cursor is not valid; pass nextCursor from the previous listing.");
  return { folder, query, cursor: cursorText ? decodeVaultCursor(cursorText) : null };
}

/** An exact ID wins over a folder that happens to be named like another folder's ID. */
export function selectVaultFolder<F extends Folder>(folders: F[], folderArg: string): F | undefined {
  if (!folderArg) return undefined;
  const selected = folders.find((folder) => folder.id === folderArg.toLowerCase()) ??
    folders.find((folder) => folder.name.toLowerCase() === folderArg.toLowerCase());
  if (!selected) throw vaultFolderNotFound(folders, false);
  return selected;
}

/** A not-found error naming the given folders; more says that others exist. */
export function vaultFolderNotFound(folders: Folder[], more: boolean): VaultListingError {
  // Names come from other managers and may reach a terminal through generic tool errors.
  const names = folders.map((folder) => JSON.stringify(terminalText(folder.name)));
  return new VaultListingError(`Folder not found. Available folders: ${names.length ? names.join(", ") : "none"}${more ? ", and more" : ""}.`);
}

export function buildVaultListing(input: {
  folders: Folder[];
  items: Item[];
  keys: Key[];
  caller: VaultCallerGrant | null;
  /** Secrets per folder counted in the database; computed from items when absent. */
  itemCounts?: Map<string, number>;
  /** The folder the caller already resolved for the folder filter. */
  selectedFolder?: Folder;
  /** Folders that listed secrets belong to but that are not in folders, used only to name them. */
  referencedFolders?: Folder[];
  /** items, in id order, stop at the read limit and more rows follow. */
  hasMoreRows?: boolean;
  /** Only the newest keys were read, so revealer counts may be lower bounds. */
  keysTruncated?: boolean;
  /** Only the first folders were read. */
  foldersTruncated?: boolean;
  /** Personal profiles have a single author of secret names; anything else needs review. */
  profileType?: string;
  folder?: unknown;
  query?: unknown;
}) {
  const { folder: folderArg, query: queryArg } = parseVaultListingArgs(input);
  const namesNeedReview = input.profileType !== "personal";
  const selected = input.selectedFolder ?? selectVaultFolder(input.folders, folderArg);
  const folderById = new Map([...input.folders, ...(input.referencedFolders ?? [])].map((folder) => [folder.id, folder]));
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
  const itemCounts = input.itemCounts ?? new Map<string, number>();
  if (!input.itemCounts) for (const item of input.items) if (item.folderId) itemCounts.set(item.folderId, (itemCounts.get(item.folderId) ?? 0) + 1);
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
  // A page ends after MAX_VAULT_LISTING_ITEMS matches, or where the read stopped.
  // The cursor resumes after the last secret returned or read.
  const page = listed.slice(0, MAX_VAULT_LISTING_ITEMS);
  const lastRead = input.items[input.items.length - 1];
  const resumeAfter = listed.length > MAX_VAULT_LISTING_ITEMS ? page[page.length - 1] : input.hasMoreRows ? lastRead : undefined;
  const nextCursor = resumeAfter ? encodeVaultCursor({ id: resumeAfter.id }) : null;
  const truncated = nextCursor !== null;
  // Pages are read in id order; each one is shown in name order.
  const items = [...page].sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => {
      const reference = `secret://${item.id}`;
      const envName = vaultEnvName(item.name);
      const envNameConflict = (envNameUses.get(envName) ?? 0) > 1;
      // Names that control process startup are never suggested; see isProcessControlEnvName.
      const envNameReserved = isProcessControlEnvName(envName);
      // In a Company Vault another owner or admin may have chosen this name.
      const envNameNeedsReview = !envNameReserved && namesNeedReview;
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
        schemaLine: envNameConflict || envNameReserved || envNameNeedsReview ? null : vaultSchemaLine({ envName, reference }),
        envNameConflict,
        envNameReserved,
        envNameNeedsReview,
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
    truncated,
    nextCursor,
    keysTruncated: Boolean(input.keysTruncated),
    foldersTruncated: Boolean(input.foldersTruncated),
    note: "Values are never returned here. Add schemaLine to .env.schema and resolve it with Varlock and a Strap API key that can reveal the secret." +
      (truncated ? " More secrets may match: call again with cursor set to nextCursor." : "") +
      (input.keysTruncated ? " Only your newest API keys were counted, so revealableByCount may be a lower bound." : ""),
  };
}
