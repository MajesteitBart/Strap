// Query strings stay plain strings (?next=/settings, ?tab=keys), the URLs the
// app has always produced, instead of the router's default JSON encoding.

export function parseSearch(search: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(search.startsWith("?") ? search.slice(1) : search));
}

// Path-like values keep readable slashes and colons (?next=/settings).
function encodeSearchValue(value: string) {
  return encodeURIComponent(value).replace(/%2F/gi, "/").replace(/%3A/gi, ":");
}

export function stringifySearch(search: Record<string, unknown>): string {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null) continue;
    pairs.push(`${encodeURIComponent(key)}=${encodeSearchValue(String(value))}`);
  }
  return pairs.length ? `?${pairs.join("&")}` : "";
}
