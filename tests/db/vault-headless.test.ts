import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as orm from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { NextResponse } from "next/server.js";
import ts from "typescript";
import * as tables from "../../db/schema/application.ts";
import * as policies from "../../lib/authz/policies.ts";
import { viewerContext, type DatabaseContext } from "../../lib/db/context.ts";
import * as queries from "../../lib/db/query.ts";
import * as repository from "../../lib/db/repositories/vault.ts";
import * as shared from "../../lib/headless-access-shared.ts";
import * as grants from "../../lib/vault-grants.ts";
import { checkRateLimit } from "../../lib/rate-limit.ts";
import { createTestDatabase, databaseTestsEnabled, sqlState } from "./harness.ts";

// Resolve server-only aliases while executing the real modules against Postgres.
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

test("the forward grant migration preserves existing keys without granting secrets", { skip: !databaseTestsEnabled }, async t => {
  const { db, connection: sql, close } = await createTestDatabase();
  t.after(close);
  // Restore main's schema only in this disposable database, then upgrade it.
  await sql`alter table creed_headless_access_keys drop column vault_item_ids`;
  await sql`delete from drizzle.__drizzle_migrations where created_at = (select max(created_at) from drizzle.__drizzle_migrations)`;
  const owner = "65000000-0000-4000-8000-000000000001";
  await sql`insert into users(id,email,name) values (${owner},'legacy@example.test','Legacy')`;
  const [{ id: company }] = await sql`select provision_company_creed(${owner}) as id`;
  const key = shared.createHeadlessKey();
  const [before] = await sql`insert into creed_headless_access_keys(user_id,creed_id,name,key_prefix,key_hash) values (${owner},${company},'Existing key',${key.prefix},${key.hash}) returning *`;
  await migrate(db, { migrationsFolder: "db/migrations" });
  const [after] = await sql`select * from creed_headless_access_keys where id=${before.id}`;
  assert.deepEqual(after, { ...before, vault_item_ids: [] });
  await migrate(db, { migrationsFolder: "db/migrations" });
  assert.deepEqual((await sql`select * from creed_headless_access_keys where id=${before.id}`)[0], after);
});

test("scoped Vault reveals enforce live Postgres permissions and audit before decryption", { skip: !databaseTestsEnabled }, async t => {
  const { db, connection: sql, close } = await createTestDatabase();
  t.after(close);
  const previousSecret = process.env.STRAP_VAULT_SECRET;
  process.env.STRAP_VAULT_SECRET = "local-test-vault-key-with-at-least-32-characters";
  t.after(() => {
    if (previousSecret === undefined) delete process.env.STRAP_VAULT_SECRET;
    else process.env.STRAP_VAULT_SECRET = previousSecret;
  });
  const owner = "64000000-0000-4000-8000-000000000001";
  const member = "64000000-0000-4000-8000-000000000002";
  await sql`insert into users(id,email,name) values (${owner},'owner@example.test','Owner'),(${member},'member@example.test','Member')`;
  const [{ id: personal }] = await sql`insert into creeds(type,name,owner_user_id) values ('personal','Personal',${owner}) returning id`;
  const [{ id: company }] = await sql`select provision_company_creed(${owner}) as id`;
  await sql`insert into creed_members(creed_id,user_id,role) values (${personal},${owner},'owner'),(${company},${member},'member')`;
  const secret = "headless-local-fixture";
  const item = await repository.vaultCreate(db, { userId: owner }, { creedId: personal, name: "Fixture", description: "", secret });
  const companyItem = await repository.vaultCreate(db, { userId: owner }, { creedId: company, name: "Company fixture", description: "", secret });
  const dependencies: Record<string, unknown> = {
    "drizzle-orm": orm,
    "@/db/schema/application": tables,
    "@/lib/authz/policies": policies,
    "@/lib/db/query": queries,
    "@/lib/db/client": { getDatabase: () => db },
    "@/lib/db/service": { serviceContext: (purpose: string): DatabaseContext => ({ database: db, actor: { kind: "service", purpose } }) },
    "@/lib/db/repositories/vault": repository,
    "@/lib/headless-access-shared": shared,
    "@/lib/vault-grants": grants,
    "@/lib/rate-limit": { checkRateLimit },
    "@/lib/env": { isDatabaseConfigured: () => true },
    "@/lib/observability": { log: { warn: () => {} } },
    "next/server": { NextResponse },
  };
  dependencies["@/lib/strap-membership"] = loadModule("../../lib/strap-membership.ts", dependencies);
  dependencies["@/lib/audit-log"] = loadModule("../../lib/audit-log.ts", dependencies);
  dependencies["@/lib/api-key-vault"] = loadModule("../../lib/api-key-vault.ts", dependencies);
  const headless = loadModule<typeof import("../../lib/headless-access.ts")>("../../lib/headless-access.ts", dependencies);
  dependencies["@/lib/headless-access"] = headless;
  const route = loadModule<typeof import("../../app/api/strap/vault/reveal/route.ts")>("../../app/api/strap/vault/reveal/route.ts", dependencies);
  const create = (vaultItemIds?: string[], creedId = personal, userId = owner) => headless.createHeadlessAccessKey({ userId, creedId, name: "Varlock", mode: "read-only", expiresAt: null, vaultItemIds });
  const request = (key: string, reference: unknown = item.id, body?: string) => route.POST(new Request("http://localhost/api/strap/vault/reveal", {
    method: "POST", headers: { authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: body ?? JSON.stringify({ reference }),
  }));
  const expectDenied = async (key: string, status: number, reference = item.id) => {
    const response = await request(key, reference);
    assert.equal(response.status, status);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.equal((await response.text()).includes(secret), false);
  };

  await t.test("explicit grants reveal only plaintext with key attribution and private metadata", async () => {
    const created = await create([item.id]);
    const response = await request(created.key, `secret://${item.id}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /private, no-store/);
    assert.equal(response.headers.get("vary"), "Authorization");
    assert.deepEqual(await response.json(), { secret });
    const [audit] = await sql`select metadata from creed_audit_log where action='vault.secret_revealed' and metadata->>'keyId'=${created.metadata.id}`;
    assert.deepEqual(audit.metadata, { itemId: item.id, creedId: personal, keyId: created.metadata.id, source: "headless" });
    const listed = await headless.listHeadlessKeys(owner, personal);
    assert.deepEqual(listed[0].vaultItemIds, [item.id]);
    assert.equal(JSON.stringify(listed).includes(created.key), false);
    assert.equal(JSON.stringify(await repository.vaultList(db, { userId: owner }, personal)).includes(secret), false);
  });

  await t.test("empty grants, unselected items and mismatched profiles never reach audit", async () => {
    const [{ count: before }] = await sql`select count(*)::int as count from creed_audit_log`;
    const legacy = shared.createHeadlessKey();
    const [row] = await sql`insert into creed_headless_access_keys(user_id,creed_id,name,key_prefix,key_hash) values (${owner},${personal},'Legacy',${legacy.prefix},${legacy.hash}) returning vault_item_ids`;
    assert.deepEqual(row.vault_item_ids, []);
    await expectDenied(legacy.key, 403);
    await expectDenied((await create()).key, 403);
    await expectDenied((await create([companyItem.id], company)).key, 403);
    const wrongProfile = await create([item.id]);
    // Simulate a stale/corrupt grant; the item's current profile must still match.
    await sql`update creed_headless_access_keys set vault_item_ids=${sql.array([companyItem.id])}::uuid[] where id=${wrongProfile.metadata.id}`;
    await expectDenied(wrongProfile.key, 403, companyItem.id);
    const [{ count: after }] = await sql`select count(*)::int as count from creed_audit_log`;
    assert.equal(after, before);
  });

  await t.test("revocation, expiry, wrong hashes and removed membership reject credentials", async () => {
    const revoked = await create([item.id]);
    await headless.revokeHeadlessAccessKey({ userId: owner, keyId: revoked.metadata.id });
    await expectDenied(revoked.key, 401);
    const expired = await create([item.id]);
    await sql`update creed_headless_access_keys set expires_at=now()-interval '1 minute' where id=${expired.metadata.id}`;
    await expectDenied(expired.key, 401);
    await expectDenied(shared.createHeadlessKey().key, 401);
    await sql`update creed_members set role='admin' where creed_id=${company} and user_id=${member}`;
    const removed = await create([companyItem.id], company, member);
    await sql`delete from creed_members where creed_id=${company} and user_id=${member}`;
    await expectDenied(removed.key, 401, companyItem.id);
    await sql`insert into creed_members(creed_id,user_id,role) values (${company},${member},'member')`;
  });

  await t.test("Company owner/admin access works and subsequent demotion blocks reveal", async () => {
    const ownerKey = await create([companyItem.id], company);
    assert.equal((await request(ownerKey.key, companyItem.id)).status, 200);
    await assert.rejects(create([companyItem.id], company, member), { status: 403 });
    await sql`update creed_members set role='admin' where creed_id=${company} and user_id=${member}`;
    const adminKey = await create([companyItem.id], company, member);
    assert.equal((await request(adminKey.key, companyItem.id)).status, 200);
    await sql`update creed_members set role='member' where creed_id=${company} and user_id=${member}`;
    await expectDenied(adminKey.key, 403, companyItem.id);
  });

  await t.test("audit failure withholds plaintext and leaves last-accessed unchanged", async () => {
    const created = await create([item.id]);
    const [before] = await sql`select last_accessed_at from creed_vault_items where id=${item.id}`;
    // Fail the real audit INSERT instead of substituting a mocked audit function.
    await sql`alter table creed_audit_log add constraint reject_reveal_test check (action <> 'vault.secret_revealed') not valid`;
    try { await expectDenied(created.key, 503); }
    finally { await sql`alter table creed_audit_log drop constraint reject_reveal_test`; }
    const [after] = await sql`select last_accessed_at from creed_vault_items where id=${item.id}`;
    assert.deepEqual(after, before);
  });

  await t.test("grants are validated before storage and viewer contexts cannot read or change keys", async () => {
    await assert.rejects(create([companyItem.id]), { status: 403 });
    await assert.rejects(create(Array(101).fill(item.id)), { status: 400 });
    const created = await create([item.id]);
    for (const value of [null, [null], Array(101).fill(item.id)]) {
      const expected = value === null ? "23502" : "23514";
      await assert.rejects(sql`update creed_headless_access_keys set vault_item_ids=${value === null ? null : sql.array(value)}::uuid[] where id=${created.metadata.id}`, sqlState(expected));
    }
    const table = tables.creed_headless_access_keys;
    for (const context of [viewerContext(db, { userId: owner }), { database: db, actor: { kind: "anonymous" } } as DatabaseContext]) {
      assert.deepEqual(await db.select().from(table).where(policies.rowScope(context, table, "select")), []);
      await assert.rejects(policies.authorizeValues(context, table, "update", { vault_item_ids: [item.id] }));
    }
  });

  await t.test("session key-creation route uses the new viewer context and validates its payload", async () => {
    dependencies["@/lib/api-auth"] = { requireApiAuth: async () => ({ user: { id: owner }, context: viewerContext(db, { userId: owner }) }) };
    const app = loadModule<typeof import("../../app/api/app/headless-access/route.ts")>("../../app/api/app/headless-access/route.ts", dependencies);
    const post = (body: unknown) => app.POST(new Request("http://localhost/api/app/headless-access", { method: "POST", body: JSON.stringify(body) }));
    for (const body of [null, [], {}, { strapId: personal, name: "Invalid", mode: "read-only", vaultItemIds: "*" }]) assert.equal((await post(body)).status, 400);
    const response = await post({ strapId: personal, name: "App key", mode: "read-only", vaultItemIds: [item.id] });
    assert.equal(response.status, 201);
    const created = await response.json();
    assert.deepEqual(created.metadata.vaultItemIds, [item.id]);
    assert.equal((await request(created.key)).status, 200);
  });

  await t.test("malformed input and rate limits are uncached and never reveal secrets", async () => {
    const created = await create([item.id]);
    await expectDenied("oauth-token", 401);
    for (const body of ["null", "[]", "{}", "{"]) assert.equal((await request(created.key, item.id, body)).status, 400);
    assert.equal((await request(created.key, item.id, " ".repeat(1025))).status, 413);
    for (let i = 0; i < 60; i++) await request(created.key, "invalid");
    const response = await request(created.key);
    assert.equal(response.status, 429);
    assert.ok(response.headers.get("retry-after"));
    assert.equal((await response.text()).includes(secret), false);
  });
});
