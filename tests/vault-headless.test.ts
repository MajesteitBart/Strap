import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as shared from "../lib/headless-access-shared.ts";
import * as grants from "../lib/vault-grants.ts";
import { checkRateLimit } from "../lib/rate-limit.ts";

// Execute the real server modules with isolated persistence. No live credentials.
function loadModule<T>(path: string, dependencies: Record<string, unknown>): T {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  new Function("require", "exports", outputText)((id: string) => {
    if (id === "server-only") return {};
    if (!(id in dependencies)) throw new Error(`Unexpected dependency: ${id}`);
    return dependencies[id];
  }, exports);
  return exports as T;
}

const itemId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const strapId = "33333333-3333-4333-8333-333333333333";
const secret = "fixture-only-secret";

function fixture() {
  const token = shared.createHeadlessKey().key;
  const state = {
    role: "owner" as "owner" | "admin" | "member" | null,
    type: "personal" as "personal" | "company",
    auditAvailable: true,
    decryptions: 0,
    audits: [] as unknown[],
    inserted: [] as Record<string, unknown>[],
    key: {
      id: "key-id", user_id: "user-id", creed_id: strapId, name: "Varlock",
      key_hash: shared.digestCredential(token), key_prefix: "strap_key_fixture", mode: "read-only",
      expires_at: null as string | null, revoked_at: null as string | null,
      created_at: new Date().toISOString(), vault_item_ids: [itemId] as string[] | undefined,
    },
    item: { id: itemId, creed_id: strapId, name: "Fixture", description: "", created_by: "user-id", created_at: "", updated_at: "", last_accessed_at: null },
  };
  const db = {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let values: Record<string, unknown> | undefined;
      const result = () => {
        const row = table === "creed_headless_access_keys" ? state.key : state.item;
        const visible = Object.entries(filters).every(([key, value]) => Reflect.get(row, key) === value);
        return { data: values ? { ...state.key, ...values } : visible ? row : null, error: null };
      };
      const query = {
        select() { return query; },
        eq(key: string, value: unknown) { filters[key] = value; return query; },
        update() { return query; },
        insert(input: Record<string, unknown>) { values = input; state.inserted.push(input); return query; },
        async single() { return result(); },
        async maybeSingle() { return result(); },
        async order() { const res = result(); return { data: res.data ? [res.data] : [], error: null }; },
        then(resolve?: (value: unknown) => unknown, reject?: (error: unknown) => unknown) { return Promise.resolve(result()).then(resolve, reject); },
      };
      return query;
    },
    async rpc() {
      state.decryptions++;
      return { data: [{ secret_value: secret, item_name: state.item.name, item_description: "", item_updated_at: "" }], error: null };
    },
  };
  const membership = {
    getStrapRole: async () => state.role,
    listUserStraps: async () => state.role ? [{ id: strapId, type: state.type, role: state.role }] : [],
  };
  const audit = {
    recordAuditEvent: async () => {},
    recordRequiredAuditEvent: async (entry: unknown) => {
      if (!state.auditAvailable) throw new Error("fixture audit unavailable");
      state.audits.push(entry);
    },
  };
  const vault = loadModule<typeof import("../lib/api-key-vault.ts")>("../lib/api-key-vault.ts", {
    "@/lib/supabase/admin": { getSupabaseAdminClient: () => db },
    "@/lib/strap-membership": membership,
    "@/lib/audit-log": audit,
  });
  const headless = loadModule<typeof import("../lib/headless-access.ts")>("../lib/headless-access.ts", {
    "@/lib/supabase/admin": { getSupabaseAdminClient: () => db },
    "@/lib/strap-membership": membership,
    "@/lib/api-key-vault": vault,
    "@/lib/headless-access-shared": shared,
    "@/lib/vault-grants": grants,
  });
  const route = loadModule<typeof import("../app/api/strap/vault/reveal/route.ts")>("../app/api/strap/vault/reveal/route.ts", {
    "@/lib/headless-access": headless,
    "@/lib/headless-access-shared": shared,
    "@/lib/api-key-vault": vault,
    "@/lib/vault-grants": grants,
    "@/lib/rate-limit": { checkRateLimit },
  });
  const request = (reference: unknown = `secret://${itemId}`, bearer = token, body?: string) => route.POST(new Request("https://strap.example/api/strap/vault/reveal", {
    method: "POST", headers: { authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
    body: body ?? JSON.stringify({ reference }),
  }));
  return { state, token, vault, headless, request };
}

test("item grants are bounded, normalized, deduplicated and opt-in", () => {
  assert.deepEqual(grants.parseVaultItemGrants(undefined), []);
  assert.deepEqual(grants.parseVaultItemGrants([itemId, itemId]), [itemId]);
  for (const value of [null, "*", [null], ["not-a-uuid"], Array(101).fill(itemId)]) {
    assert.equal(grants.parseVaultItemGrants(value), undefined);
  }
  assert.equal(grants.parseVaultReference(`secret://${itemId}`), itemId);
  assert.equal(grants.parseVaultReference(`secret://${itemId}/field`), null);
});

test("explicit reveals return only the secret and persist attribution without plaintext", async () => {
  const { state, request } = fixture();
  const response = await request();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("vary"), "Authorization");
  assert.deepEqual(await response.json(), { secret });
  assert.equal(state.decryptions, 1);
  assert.equal(state.audits.length, 1);
  const audit = JSON.stringify(state.audits);
  assert.match(audit, /key-id/);
  assert.match(audit, /headless/);
  assert.equal(audit.includes(secret), false);
});

test("old keys, unselected secrets and other profiles cannot decrypt", async () => {
  for (const setup of [
    (f: ReturnType<typeof fixture>) => { f.state.key.vault_item_ids = undefined; },
    (f: ReturnType<typeof fixture>) => { f.state.key.vault_item_ids = []; },
    (f: ReturnType<typeof fixture>) => { f.state.key.vault_item_ids = [otherId]; },
    (f: ReturnType<typeof fixture>) => { f.state.item.creed_id = otherId; },
  ]) {
    const f = fixture(); setup(f);
    const response = await f.request();
    assert.equal(response.status, 403);
    assert.equal(f.state.decryptions, 0);
    assert.equal((await response.text()).includes(secret), false);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  }
});

test("revocation, expiry, hash mismatch and membership removal deny before decrypting", async () => {
  for (const setup of [
    (f: ReturnType<typeof fixture>) => { f.state.key.revoked_at = new Date().toISOString(); },
    (f: ReturnType<typeof fixture>) => { f.state.key.expires_at = new Date(0).toISOString(); },
    (f: ReturnType<typeof fixture>) => { f.state.key.key_hash = "different"; },
    (f: ReturnType<typeof fixture>) => { f.state.role = null; },
  ]) {
    const f = fixture(); setup(f);
    assert.equal((await f.request()).status, 401);
    assert.equal(f.state.decryptions, 0);
  }
});

test("Company owner/admin work; a subsequent demotion blocks reveal", async () => {
  const f = fixture();
  f.state.type = "company";
  for (const role of ["owner", "admin"] as const) {
    f.state.role = role;
    assert.equal((await f.request()).status, 200);
  }
  f.state.role = "member";
  assert.equal((await f.request()).status, 403);
  assert.equal(f.state.decryptions, 2);
});

test("required audit failure withholds decrypted plaintext", async () => {
  const f = fixture();
  f.state.auditAvailable = false;
  const response = await f.request();
  assert.equal(response.status, 503);
  assert.equal(f.state.decryptions, 1);
  assert.equal((await response.text()).includes(secret), false);
});

test("key creation validates selected items and Company permission before persisting", async () => {
  const f = fixture();
  const input = { userId: "user-id", creedId: strapId, name: "Varlock", mode: "read-only" as const, expiresAt: null };
  const contextOnly = await f.headless.createHeadlessAccessKey(input);
  assert.deepEqual(contextOnly.metadata.vaultItemIds, []);
  await f.headless.createHeadlessAccessKey({ ...input, vaultItemIds: [itemId] });
  await assert.rejects(f.headless.createHeadlessAccessKey({ ...input, vaultItemIds: [otherId] }), /selected Strap/);
  f.state.type = "company"; f.state.role = "member";
  await assert.rejects(f.headless.createHeadlessAccessKey({ ...input, vaultItemIds: [itemId] }), /owner or admin/);
  assert.equal(f.state.inserted.length, 2);
  assert.equal(JSON.stringify(f.state.inserted).includes(contextOnly.key), false);
});

test("malformed input and rate limits are uncached and cannot leak plaintext", async () => {
  const f = fixture();
  assert.equal((await f.request(itemId, "oauth-token")).status, 401);
  for (const body of ["null", "[]", "{}", "{"]) {
    assert.equal((await f.request(itemId, f.token, body)).status, 400);
  }
  assert.equal((await f.request(itemId, f.token, " ".repeat(1025))).status, 413);
  for (let i = 0; i < 60; i++) await f.request("invalid");
  const response = await f.request();
  assert.equal(response.status, 429);
  assert.ok(response.headers.get("retry-after"));
  assert.equal(f.state.decryptions, 0);
});
