import { resolveHeadlessAccessKey } from "@/lib/headless-access";
import { digestCredential, isHeadlessKey } from "@/lib/headless-access-shared";
import { revealVaultItem, VaultAccessError } from "@/lib/api-key-vault";
import { MAX_VAULT_ITEM_GRANTS, parseVaultReference } from "@/lib/vault-grants";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "private, no-store", "Vary": "Authorization" };

/** Dedicated reveal boundary. OAuth and ordinary MCP credentials grant no secrets. */
export async function POST(request: Request) {
  const respond = (body: object, status: number, extraHeaders = {}) =>
    Response.json(body, { status, headers: { ...NO_STORE, ...extraHeaders } });
  const authorization = request.headers.get("authorization") ?? "";
  const token = /^Bearer (\S+)$/i.exec(authorization)?.[1];
  if (!token || token.length > 256 || !isHeadlessKey(token)) {
    return respond({ error: "A scoped Strap API key is required." }, 401);
  }
  const limit = checkRateLimit({
    // Allow one full schema load followed by a run, even at the grant limit.
    scope: "vault-reveal", identifier: digestCredential(token), limit: MAX_VAULT_ITEM_GRANTS * 2, windowMs: 60_000,
  });
  if (!limit.ok) return respond({ error: "Too many requests." }, 429, { "Retry-After": String(limit.retryAfterSeconds) });

  try {
    const credential = await resolveHeadlessAccessKey(token);
    if (!credential) return respond({ error: "Invalid or expired Strap API key." }, 401);
    // The body contains a single public item reference. Bound it before parsing.
    const reader = request.body?.getReader();
    if (!reader) return respond({ error: "A secret reference is required." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) {
        await reader.cancel();
        return respond({ error: "Request is too large." }, 413);
      }
      chunks.push(value);
    }
    let payload: unknown;
    try { payload = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return respond({ error: "Expected a JSON object." }, 400); }
    const itemId = parseVaultReference(
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as Record<string, unknown>).reference : null,
    );
    if (!itemId) return respond({ error: "Use a Vault item UUID or secret://UUID reference." }, 400);
    const { secret } = await revealVaultItem({ userId: credential.userId, itemId, request, credential });
    return respond({ secret }, 200);
  } catch (error) {
    return respond(
      { error: error instanceof VaultAccessError ? error.message : "Vault reveal is unavailable." },
      error instanceof VaultAccessError ? error.status : 503,
    );
  }
}
