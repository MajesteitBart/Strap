/** Explicit item grants are independent of a key's context-editing mode. */
export const MAX_VAULT_ITEM_GRANTS = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseVaultItemGrants(value: unknown): string[] | undefined {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_VAULT_ITEM_GRANTS) return undefined;
  if (!value.every((id): id is string => typeof id === "string" && UUID.test(id))) return undefined;
  return [...new Set(value.map((id) => id.toLowerCase()))];
}

export function parseVaultReference(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.startsWith("secret://") ? value.slice("secret://".length) : value;
  return UUID.test(id) ? id.toLowerCase() : null;
}
