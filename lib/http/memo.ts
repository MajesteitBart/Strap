// Keeps a successful async result in process memory for `ttlMs`. Warm server
// instances reuse it, which caps calls to third-party APIs (GitHub, median,
// the status page) per instance; CDN caching headers on the responses cover
// the rest. Failures are not cached, so the next request retries.
const entries = new Map<string, { expires: number; value: Promise<unknown> }>();

export function memoize<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = entries.get(key);
  if (hit && hit.expires > now) return hit.value as Promise<T>;
  const value = load();
  entries.set(key, { expires: now + ttlMs, value });
  value.catch(() => {
    if (entries.get(key)?.value === value) entries.delete(key);
  });
  return value;
}
