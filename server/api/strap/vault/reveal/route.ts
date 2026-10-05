import { findHeadlessAccessKey, recordHeadlessKeyUse } from "@/lib/headless-access";
import { digestCredential, isHeadlessKey } from "@/lib/headless-access-shared";
import { countRevealableVaultItems, revealVaultItem, VaultAccessError } from "@/lib/api-key-vault";
import { MAX_VAULT_ITEM_GRANTS, MAX_VAULT_REVEALS_PER_MINUTE, parseVaultReference } from "@/lib/vault-grants";
import { checkRateLimit } from "@/lib/rate-limit";

const NO_STORE = { "Cache-Control": "private, no-store", "Vary": "Authorization" };
// A reveal body is one short reference. Requests that hold it open would let a
// key with a large budget keep many connections waiting, so each token gets a
// few concurrent requests and a short deadline to send its body.
const MAX_CONCURRENT_REVEALS = 20;
const BODY_DEADLINE_MS = 5_000;
const inFlight = new Map<string, number>();
// Across all of a user's keys, before any per-request counting. Both are well
// above what one key's flood guard and slot limit allow, so a single leaked key
// cannot exhaust them for the user's other keys; many keys share them.
const MAX_USER_PREFLIGHT_PER_MINUTE = 5 * MAX_VAULT_REVEALS_PER_MINUTE;
const MAX_CONCURRENT_REVEALS_PER_USER = 3 * MAX_CONCURRENT_REVEALS;
const userInFlight = new Map<string, number>();

async function readWithin(reader: ReadableStreamDefaultReader<Uint8Array>, deadline: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), Math.max(0, deadline - Date.now())); });
  try {
    return await Promise.race([reader.read(), expired]);
  } finally {
    clearTimeout(timer);
  }
}

/** Dedicated reveal boundary. OAuth and ordinary MCP credentials grant no secrets. */
export async function POST(request: Request) {
  const respond = (body: object, status: number, extraHeaders = {}) =>
    Response.json(body, { status, headers: { ...NO_STORE, ...extraHeaders } });
  const authorization = request.headers.get("authorization") ?? "";
  const token = /^Bearer (\S+)$/i.exec(authorization)?.[1];
  if (!token || token.length > 256 || !isHeadlessKey(token)) {
    return respond({ error: "A scoped Strap API key is required." }, 401);
  }
  const tooMany = (retryAfterSeconds: number) =>
    respond({ error: "Too many requests." }, 429, { "Retry-After": String(retryAfterSeconds) });
  // Flood guard before any database work; the per-key limit below is tighter.
  const flood = checkRateLimit({
    scope: "vault-reveal-flood", identifier: digestCredential(token), limit: MAX_VAULT_REVEALS_PER_MINUTE, windowMs: 60_000,
  });
  if (!flood.ok) return tooMany(flood.retryAfterSeconds);
  const slot = digestCredential(token);
  const open = inFlight.get(slot) ?? 0;
  if (open >= MAX_CONCURRENT_REVEALS) return tooMany(1);
  inFlight.set(slot, open + 1);
  let userSlot: string | null = null;

  try {
    // Reads only until the limits below allow the request; recording use locks
    // and writes the key row.
    const found = await findHeadlessAccessKey(token);
    if (!found) return respond({ error: "Invalid or expired Strap API key." }, 401);
    if (found.vaultItemIds.length === 0 && found.vaultFolderIds.length === 0) {
      return respond({ error: "Secret access was not granted to this key." }, 403);
    }
    const preflight = checkRateLimit({ scope: "vault-reveal-user-preflight", identifier: found.userId, limit: MAX_USER_PREFLIGHT_PER_MINUTE, windowMs: 60_000 });
    if (!preflight.ok) return tooMany(preflight.retryAfterSeconds);
    const userOpen = userInFlight.get(found.userId) ?? 0;
    if (userOpen >= MAX_CONCURRENT_REVEALS_PER_USER) return tooMany(1);
    userInFlight.set(found.userId, userOpen + 1);
    userSlot = found.userId;
    // Allow one full schema load followed by a run of everything this key can
    // reveal. Folder grants grow as secrets are added, so size the limit on use.
    const coverage = await countRevealableVaultItems(found.userId, found);
    const limit = checkRateLimit({
      scope: "vault-reveal",
      identifier: found.keyId,
      limit: Math.min(MAX_VAULT_REVEALS_PER_MINUTE, 2 * Math.max(MAX_VAULT_ITEM_GRANTS, coverage)),
      windowMs: 60_000,
    });
    if (!limit.ok) return tooMany(limit.retryAfterSeconds);
    // All of a user's keys share one budget, so creating more keys does not
    // multiply key-use writes or reveal transactions. It is spent only by
    // requests the key's own limit admitted, so one key cannot exhaust it for
    // the user's other keys beyond that limit.
    const perUser = checkRateLimit({ scope: "vault-reveal-user", identifier: found.userId, limit: MAX_VAULT_REVEALS_PER_MINUTE, windowMs: 60_000 });
    if (!perUser.ok) return tooMany(perUser.retryAfterSeconds);
    const credential = await recordHeadlessKeyUse(token, found.keyId);
    if (!credential) return respond({ error: "Invalid or expired Strap API key." }, 401);
    // The body contains a single public item reference. Bound it before parsing.
    const reader = request.body?.getReader();
    if (!reader) return respond({ error: "A secret reference is required." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    const deadline = Date.now() + BODY_DEADLINE_MS;
    while (true) {
      const next = await readWithin(reader, deadline);
      if (!next) {
        await reader.cancel().catch(() => undefined);
        return respond({ error: "The request body took too long." }, 408);
      }
      const { value, done } = next;
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
    const { secret } = await revealVaultItem({ userId: credential.userId, itemId, request, credential: { ...credential, keyHash: digestCredential(token) } });
    return respond({ secret }, 200);
  } catch (error) {
    return respond(
      { error: error instanceof VaultAccessError ? error.message : "Vault reveal is unavailable." },
      error instanceof VaultAccessError ? error.status : 503,
    );
  } finally {
    const remaining = (inFlight.get(slot) ?? 1) - 1;
    if (remaining > 0) inFlight.set(slot, remaining); else inFlight.delete(slot);
    if (userSlot) {
      const userRemaining = (userInFlight.get(userSlot) ?? 1) - 1;
      if (userRemaining > 0) userInFlight.set(userSlot, userRemaining); else userInFlight.delete(userSlot);
    }
  }
}
