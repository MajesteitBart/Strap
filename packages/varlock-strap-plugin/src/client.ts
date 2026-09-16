/** No disk cache or upstream error bodies: every resolution rechecks Strap access. */
export const DEFAULT_STRAP_URL = "https://strap.bvdm.ai";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function strapEndpoint(server: unknown = DEFAULT_STRAP_URL): URL {
  let url: URL;
  try {
    if (typeof server !== "string") throw new Error();
    url = new URL(server);
  } catch { throw new Error("Strap server must be an HTTPS origin."); }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
      url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Strap server must be an HTTPS origin (HTTP is allowed only on loopback).");
  }
  return new URL("/api/strap/vault/reveal", url);
}

export function strapReference(value: unknown): string {
  if (typeof value !== "string") throw new Error("Use a Vault item UUID or secret://UUID reference.");
  const id = value.startsWith("secret://") ? value.slice(9) : value;
  if (!UUID.test(id)) throw new Error("Use a Vault item UUID or secret://UUID reference.");
  return `secret://${id.toLowerCase()}`;
}

export async function fetchStrapSecret(input: {
  token: unknown;
  server?: unknown;
  reference: unknown;
}, fetcher: typeof fetch = fetch): Promise<string> {
  const endpoint = strapEndpoint(input.server);
  const reference = strapReference(input.reference);
  if (typeof input.token !== "string" || !/^(?:strap|creed)_key_[A-Za-z0-9_-]{32,128}$/.test(input.token)) {
    throw new Error("Set a scoped Strap API key in the token config item.");
  }
  let response: Response;
  try {
    response = await fetcher(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ reference }),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error("Could not reach Strap. Check the server URL and connection.");
  }
  if (!response.ok) {
    await response.body?.cancel();
    const messages: Record<number, string> = {
      401: "Strap API key is invalid, expired, or revoked.",
      403: "Strap API key is not authorized for this secret. Check its selected items and current Vault permissions.",
      404: "Strap Vault item no longer exists.",
      429: "Strap reveal rate limit reached. Retry later.",
      503: "Strap reveal or its required audit is unavailable. Retry later.",
    };
    throw new Error(messages[response.status] ?? "Strap could not reveal the secret.");
  }
  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new Error("Strap returned an invalid reveal response."); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      !("secret" in payload) || typeof payload.secret !== "string" || payload.secret.length > 16_384) {
    throw new Error("Strap returned an invalid reveal response.");
  }
  return payload.secret;
}
