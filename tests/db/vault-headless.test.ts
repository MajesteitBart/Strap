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
import * as strapApi from "../../lib/strap-api.ts";
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
  // Restore the pre-grant schema only in this disposable database, then upgrade it.
  // Later migrations roll back too: the migrator only applies entries newer than
  // the latest one it has recorded.
  const journal = JSON.parse(readFileSync(new URL("../../db/migrations/meta/_journal.json", import.meta.url), "utf8")) as { entries: Array<{ tag: string; when: number }> };
  const grantMigration = journal.entries.find(entry => entry.tag === "0001_headless_vault_item_grants")!.when;
  await sql`alter table creed_vault_items drop column folder_id`;
  await sql`drop table strap_vault_folders`;
  await sql`alter table creed_headless_access_keys drop column vault_folder_ids`;
  await sql`drop table auth_totp_replay_claims`;
  await sql`drop table two_factors`;
  await sql`alter table users drop column two_factor_enabled`;
  await sql`alter table creed_headless_access_keys drop column vault_item_ids`;
  await sql`delete from drizzle.__drizzle_migrations where created_at >= ${grantMigration}`;
  const owner = "65000000-0000-4000-8000-000000000001";
  await sql`insert into users(id,email,name) values (${owner},'legacy@example.test','Legacy')`;
  const [{ id: company }] = await sql`select provision_company_creed(${owner}) as id`;
  const key = shared.createHeadlessKey();
  const [before] = await sql`insert into creed_headless_access_keys(user_id,creed_id,name,key_prefix,key_hash) values (${owner},${company},'Existing key',${key.prefix},${key.hash}) returning *`;
  const [legacyItem] = await sql`insert into creed_vault_items(creed_id,name,secret_ciphertext,created_by) values (${company},'Legacy item','opaque',${owner}) returning *`;
  await migrate(db, { migrationsFolder: "db/migrations" });
  // Existing items arrive outside any folder, so no key gains access through one.
  assert.deepEqual((await sql`select * from creed_vault_items where id=${legacyItem.id}`)[0], { ...legacyItem, folder_id: null });
  const [after] = await sql`select * from creed_headless_access_keys where id=${before.id}`;
  assert.deepEqual(after, { ...before, vault_item_ids: [], vault_folder_ids: [] });
  // Existing accounts arrive without MFA.
  assert.equal((await sql`select two_factor_enabled from users where id=${owner}`)[0].two_factor_enabled, false);
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

  const createWith = (grants: { vaultItemIds?: string[]; vaultFolderIds?: string[] }, creedId = personal, userId = owner) =>
    headless.createHeadlessAccessKey({ userId, creedId, name: "Folder key", mode: "read-only", expiresAt: null, ...grants });
  type GrantInput = { vaultItemIds: unknown; vaultFolderIds: unknown };
  const editGrants = (keyId: string, next: GrantInput, expected: GrantInput, userId = owner) =>
    headless.updateHeadlessKeyGrants({ userId, keyId, ...next, expected });
  const auditFor = async (keyId: string) =>
    (await sql`select metadata from creed_audit_log where action='vault.secret_revealed' and metadata->>'keyId'=${keyId} order by created_at desc limit 1`)[0]?.metadata;

  await t.test("folder grants reveal current folder members only while they stay in the folder", async () => {
    const folder = await repository.vaultFolderCreate(db, { userId: owner }, { strapId: personal, name: "share-artifact", description: "" });
    const inFolder = await repository.vaultCreate(db, { userId: owner }, { creedId: personal, name: "SHARE_ARTIFACT_SERVER", description: "", secret, folderId: folder.id });
    const created = await createWith({ vaultFolderIds: [folder.id] });
    assert.deepEqual(created.metadata.vaultFolderIds, [folder.id]);
    const response = await request(created.key, `secret://${inFolder.id}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { secret });
    assert.deepEqual(await auditFor(created.metadata.id), { itemId: inFolder.id, creedId: personal, keyId: created.metadata.id, source: "headless", folderId: folder.id });
    // Items added to the folder later are covered without changing the key.
    const added = await repository.vaultCreate(db, { userId: owner }, { creedId: personal, name: "Added later", description: "", secret });
    await expectDenied(created.key, 403, added.id);
    await repository.vaultUpdate(db, { userId: owner }, { itemId: added.id, name: added.name, description: "", secret: null, folderId: folder.id });
    assert.equal((await request(created.key, added.id)).status, 200);
    // Leaving the folder removes folder-based access; a direct grant is unaffected.
    const direct = await createWith({ vaultItemIds: [added.id] });
    await repository.vaultUpdate(db, { userId: owner }, { itemId: added.id, name: added.name, description: "", secret: null, folderId: null });
    await expectDenied(created.key, 403, added.id);
    assert.equal((await request(direct.key, added.id)).status, 200);
    // Keeping the folder when folderId is omitted.
    const { updated } = await repository.vaultUpdate(db, { userId: owner }, { itemId: inFolder.id, name: inFolder.name, description: "Renamed only", secret: null });
    assert.equal(updated.folder_id, folder.id);
  });

  await t.test("folders, items and grants cannot cross profiles", async () => {
    const companyFolder = await repository.vaultFolderCreate(db, { userId: owner }, { strapId: company, name: "company-ci", description: "" });
    await assert.rejects(repository.vaultCreate(db, { userId: owner }, { creedId: personal, name: "Cross", description: "", secret, folderId: companyFolder.id }), { status: 400 });
    await assert.rejects(repository.vaultUpdate(db, { userId: owner }, { itemId: item.id, name: item.name, description: "", secret: null, folderId: companyFolder.id }), { status: 400 });
    await assert.rejects(createWith({ vaultFolderIds: [companyFolder.id] }), { status: 403 });
    await assert.rejects(sql`update creed_vault_items set folder_id=${companyFolder.id} where id=${item.id}`, sqlState("23503"));
    // A stale folder grant from another profile never matches a personal item.
    const stale = await createWith({ vaultItemIds: [] });
    await sql`update creed_headless_access_keys set vault_folder_ids=${sql.array([companyFolder.id])}::uuid[] where id=${stale.metadata.id}`;
    await sql`update creed_vault_items set folder_id=${companyFolder.id} where id=${companyItem.id}`;
    await expectDenied(stale.key, 403, companyItem.id);
    // Members see no folders; duplicate names conflict case-insensitively.
    await assert.rejects(repository.vaultFolderList(db, { userId: member }, company), { status: 403 });
    await assert.rejects(repository.vaultFolderCreate(db, { userId: member }, { strapId: company, name: "member", description: "" }), { status: 403 });
    await assert.rejects(repository.vaultFolderCreate(db, { userId: owner }, { strapId: company, name: "COMPANY-CI", description: "" }), { status: 409 });
    await sql`update creed_vault_items set folder_id=null where id=${companyItem.id}`;
  });

  await t.test("deleting a folder keeps its items and removes folder-based access", async () => {
    const folder = await repository.vaultFolderCreate(db, { userId: owner }, { strapId: personal, name: "temporary", description: "" });
    const kept = await repository.vaultCreate(db, { userId: owner }, { creedId: personal, name: "Kept secret", description: "", secret, folderId: folder.id });
    const created = await createWith({ vaultFolderIds: [folder.id] });
    assert.equal((await request(created.key, kept.id)).status, 200);
    const deleted = await repository.vaultFolderDelete(db, { userId: owner }, folder.id);
    assert.deepEqual(deleted.movedItemIds, [kept.id]);
    assert.equal((await sql`select folder_id from creed_vault_items where id=${kept.id}`)[0].folder_id, null);
    await expectDenied(created.key, 403, kept.id);
    await assert.rejects(repository.vaultFolderDelete(db, { userId: owner }, folder.id), { status: 403 });
  });

  await t.test("grant edits and rotation keep the key identity and recheck Vault access", async () => {
    const folder = await repository.vaultFolderCreate(db, { userId: owner }, { strapId: personal, name: "rotating", description: "" });
    const target = await repository.vaultCreate(db, { userId: owner }, { creedId: personal, name: "Rotating target", description: "", secret, folderId: folder.id });
    const created = await createWith({});
    await expectDenied(created.key, 403, target.id);
    const none = { vaultItemIds: [], vaultFolderIds: [] };
    const withFolder = { vaultItemIds: [], vaultFolderIds: [folder.id] };
    const updated = await editGrants(created.metadata.id, withFolder, none);
    assert.ok(updated.status === "updated");
    assert.deepEqual(updated.previous.vaultFolderIds, []);
    assert.deepEqual(updated.metadata.vaultFolderIds, [folder.id]);
    assert.equal((await request(created.key, target.id)).status, 200);
    await assert.rejects(editGrants(created.metadata.id, { vaultItemIds: [companyItem.id], vaultFolderIds: [] }, withFolder), { status: 403 });
    await assert.rejects(editGrants(created.metadata.id, { vaultItemIds: "*", vaultFolderIds: [] }, withFolder), { status: 400 });
    await assert.rejects(editGrants(created.metadata.id, none, { vaultItemIds: "*", vaultFolderIds: [] }), { status: 400 });
    assert.deepEqual(await editGrants(created.metadata.id, none, withFolder, member), { status: "not-found" });

    const rotated = await headless.rotateHeadlessAccessKey({ userId: owner, keyId: created.metadata.id });
    assert.ok(rotated.status === "rotated");
    assert.notEqual(rotated.key, created.key);
    assert.equal(rotated.metadata.id, created.metadata.id);
    assert.deepEqual(rotated.metadata.vaultFolderIds, [folder.id]);
    await expectDenied(created.key, 401, target.id);
    assert.equal((await request(rotated.key, target.id)).status, 200);
    assert.deepEqual(await headless.rotateHeadlessAccessKey({ userId: member, keyId: created.metadata.id }), { status: "not-found" });

    await headless.revokeHeadlessAccessKey({ userId: owner, keyId: created.metadata.id });
    assert.deepEqual(await headless.rotateHeadlessAccessKey({ userId: owner, keyId: created.metadata.id }), { status: "not-found" });
    assert.deepEqual(await editGrants(created.metadata.id, none, withFolder), { status: "not-found" });
  });

  await t.test("grant edits based on stale or concurrently changed grants conflict", async () => {
    const shared1 = await repository.vaultCreate(db, { userId: owner }, { creedId: personal, name: "Contested A", description: "", secret });
    const shared2 = await repository.vaultCreate(db, { userId: owner }, { creedId: personal, name: "Contested B", description: "", secret });
    const created = await createWith({ vaultItemIds: [shared1.id] });
    const loaded = { vaultItemIds: [shared1.id], vaultFolderIds: [] };
    // Tab A removes the grant; tab B, opened earlier, then tries to add another.
    assert.equal((await editGrants(created.metadata.id, { vaultItemIds: [], vaultFolderIds: [] }, loaded)).status, "updated");
    assert.deepEqual(await editGrants(created.metadata.id, { vaultItemIds: [shared1.id, shared2.id], vaultFolderIds: [] }, loaded), { status: "conflict" });
    assert.deepEqual((await sql`select vault_item_ids from creed_headless_access_keys where id=${created.metadata.id}`)[0].vault_item_ids, []);
    // Two concurrent edits from the same base: one applies, the other conflicts.
    const results = await Promise.all([
      editGrants(created.metadata.id, { vaultItemIds: [shared1.id], vaultFolderIds: [] }, { vaultItemIds: [], vaultFolderIds: [] }),
      editGrants(created.metadata.id, { vaultItemIds: [shared2.id], vaultFolderIds: [] }, { vaultItemIds: [], vaultFolderIds: [] }),
    ]);
    assert.deepEqual(results.map(result => result.status).sort(), ["conflict", "updated"]);
    // Order and case of the expected IDs do not matter.
    const stored = (await sql`select vault_item_ids from creed_headless_access_keys where id=${created.metadata.id}`)[0].vault_item_ids as string[];
    assert.equal((await editGrants(created.metadata.id, { vaultItemIds: [], vaultFolderIds: [] }, { vaultItemIds: stored.map(id => id.toUpperCase()), vaultFolderIds: [] })).status, "updated");
  });

  await t.test("expired keys cannot be rotated or edited", async () => {
    const expiring = await createWith({ vaultItemIds: [item.id] });
    await sql`update creed_headless_access_keys set expires_at=now()-interval '1 minute' where id=${expiring.metadata.id}`;
    assert.deepEqual(await headless.rotateHeadlessAccessKey({ userId: owner, keyId: expiring.metadata.id }), { status: "not-found" });
    assert.deepEqual(await editGrants(expiring.metadata.id, { vaultItemIds: [], vaultFolderIds: [] }, { vaultItemIds: [item.id], vaultFolderIds: [] }), { status: "not-found" });
    const [row] = await sql`select key_hash, vault_item_ids from creed_headless_access_keys where id=${expiring.metadata.id}`;
    assert.equal(row.key_hash, shared.digestCredential(expiring.key));
    assert.deepEqual(row.vault_item_ids, [item.id]);
  });

  await t.test("of two concurrent rotations exactly one returns a working key", async () => {
    const contested = await createWith({ vaultItemIds: [item.id] });
    const results = await Promise.all([
      headless.rotateHeadlessAccessKey({ userId: owner, keyId: contested.metadata.id }),
      headless.rotateHeadlessAccessKey({ userId: owner, keyId: contested.metadata.id }),
    ]);
    assert.deepEqual(results.map(result => result.status).sort(), ["conflict", "rotated"]);
    const winner = results.find(result => result.status === "rotated");
    assert.ok(winner?.status === "rotated");
    assert.equal((await request(winner.key, item.id)).status, 200);
    await expectDenied(contested.key, 401, item.id);
  });

  await t.test("folder creation rechecks the current Company role", async () => {
    await sql`update creed_members set role='admin' where creed_id=${company} and user_id=${member}`;
    const allowed = await repository.vaultFolderCreate(db, { userId: member }, { strapId: company, name: "admin-folder", description: "" });
    assert.equal(allowed.strap_id, company);
    await sql`update creed_members set role='member' where creed_id=${company} and user_id=${member}`;
    await assert.rejects(repository.vaultFolderCreate(db, { userId: member }, { strapId: company, name: "after-demotion", description: "" }), { status: 403 });
    await assert.rejects(repository.vaultFolderDelete(db, { userId: member }, allowed.id), { status: 403 });
    assert.equal((await sql`select count(*)::int as count from strap_vault_folders where id=${allowed.id}`)[0].count, 1);
  });

  await t.test("a folder that grows mid-window raises the key's reveal budget", async () => {
    const growing = await repository.vaultFolderCreate(db, { userId: owner }, { strapId: personal, name: "growing", description: "" });
    const first = await repository.vaultCreate(db, { userId: owner }, { creedId: personal, name: "Growing 0", description: "", secret, folderId: growing.id });
    const created = await createWith({ vaultFolderIds: [growing.id] });
    // The first reveal opens a 200-request window for a one-secret folder.
    assert.equal((await request(created.key, first.id)).status, 200);
    const added = [first];
    for (let index = 1; index < 150; index++) {
      added.push(await repository.vaultCreate(db, { userId: owner }, { creedId: personal, name: `Growing ${index}`, description: "", secret, folderId: growing.id }));
    }
    // 150 secrets allow 300 reveals in this window, including the one already used.
    for (let index = 1; index < 300; index++) assert.equal((await request(created.key, added[index % added.length].id)).status, 200);
    assert.equal((await request(created.key, first.id)).status, 429);
  });

  await t.test("the reveal limit grows with the secrets a key can reveal", async () => {
    const big = await repository.vaultFolderCreate(db, { userId: owner }, { strapId: personal, name: "big", description: "" });
    const filed = [];
    for (let index = 0; index < 150; index++) {
      filed.push(await repository.vaultCreate(db, { userId: owner }, { creedId: personal, name: `Big ${index}`, description: "", secret, folderId: big.id }));
    }
    const created = await createWith({ vaultFolderIds: [big.id] });
    assert.equal(await repository.vaultGrantCoverage(db, { creedId: personal, vaultItemIds: [], vaultFolderIds: [big.id] }), 150);
    // A schema load followed by a run of all 150 secrets fits in one window.
    for (let pass = 0; pass < 2; pass++) {
      for (const entry of filed) assert.equal((await request(created.key, entry.id)).status, 200);
    }
    const throttled = await request(created.key, filed[0].id);
    assert.equal(throttled.status, 429);
    assert.ok(throttled.headers.get("retry-after"));
  });

  await t.test("session routes edit grants, rotate keys and manage folders", async () => {
    dependencies["@/lib/api-auth"] = { requireApiAuth: async () => ({ user: { id: owner }, context: viewerContext(db, { userId: owner }) }) };
    dependencies["@/lib/strap-api"] = strapApi;
    const keyRoute = loadModule<typeof import("../../app/api/app/headless-access/[id]/route.ts")>("../../app/api/app/headless-access/[id]/route.ts", dependencies);
    const rotateRoute = loadModule<typeof import("../../app/api/app/headless-access/[id]/rotate/route.ts")>("../../app/api/app/headless-access/[id]/rotate/route.ts", dependencies);
    const foldersRoute = loadModule<typeof import("../../app/api/app/vault/folders/route.ts")>("../../app/api/app/vault/folders/route.ts", dependencies);
    const folderRoute = loadModule<typeof import("../../app/api/app/vault/folders/[id]/route.ts")>("../../app/api/app/vault/folders/[id]/route.ts", dependencies);
    const json = (method: string, body: unknown) => new Request("http://localhost/api/app", { method, body: JSON.stringify(body) });
    const params = (id: string) => ({ params: Promise.resolve({ id }) });

    const createdFolder = await foldersRoute.POST(json("POST", { strapId: personal, name: "routes", description: "From the route" }));
    assert.equal(createdFolder.status, 201);
    const { folder } = await createdFolder.json() as { folder: { id: string } };
    assert.equal((await foldersRoute.POST(json("POST", { strapId: personal, name: "ROUTES", description: "" }))).status, 409);
    assert.equal((await folderRoute.PATCH(json("PATCH", { name: "routes-renamed", description: "" }), params(folder.id))).status, 200);
    // Valid JSON that is not an object is a client error, not a server error.
    for (const body of [null, [], "text", 7]) {
      assert.equal((await foldersRoute.POST(json("POST", body))).status, 400);
      assert.equal((await folderRoute.PATCH(json("PATCH", body), params(folder.id))).status, 400);
    }
    // Folder names stay on one line; they appear in CLI selections and schema comments.
    assert.equal((await foldersRoute.POST(json("POST", { strapId: personal, name: "prod\nINJECTED=value", description: "" }))).status, 400);
    assert.equal((await folderRoute.PATCH(json("PATCH", { name: "tab\there", description: "" }), params(folder.id))).status, 400);
    const target = await repository.vaultCreate(db, { userId: owner }, { creedId: personal, name: "Route target", description: "", secret, folderId: folder.id });

    const created = await createWith({});
    const base = { vaultItemIds: [], vaultFolderIds: [] };
    for (const body of [null, {}, { vaultItemIds: [] }, { vaultItemIds: [], vaultFolderIds: "*", expected: base }, { vaultItemIds: [], vaultFolderIds: [] }, { vaultItemIds: [], vaultFolderIds: [], expected: { vaultItemIds: [] } }]) {
      assert.equal((await keyRoute.PATCH(json("PATCH", body), params(created.metadata.id))).status, 400);
    }
    const stale = await keyRoute.PATCH(json("PATCH", { vaultItemIds: [], vaultFolderIds: [folder.id], expected: { vaultItemIds: [target.id], vaultFolderIds: [] } }), params(created.metadata.id));
    assert.equal(stale.status, 409);
    const patched = await keyRoute.PATCH(json("PATCH", { vaultItemIds: [], vaultFolderIds: [folder.id], expected: base }), params(created.metadata.id));
    assert.equal(patched.status, 200);
    assert.deepEqual((await patched.json() as { metadata: { vaultFolderIds: string[] } }).metadata.vaultFolderIds, [folder.id]);
    // Routes record this audit without awaiting it.
    let grantAudit: { metadata: { vaultFolderIds: string[] } } | undefined;
    for (let attempt = 0; attempt < 50 && !grantAudit; attempt++) {
      [grantAudit] = await sql`select metadata from creed_audit_log where action='headless.key_grants_updated' and metadata->>'keyId'=${created.metadata.id}` as unknown as Array<{ metadata: { vaultFolderIds: string[] } }>;
      if (!grantAudit) await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.deepEqual(grantAudit?.metadata.vaultFolderIds, [folder.id]);
    assert.equal((await request(created.key, target.id)).status, 200);

    const rotated = await rotateRoute.POST(new Request("http://localhost/api/app", { method: "POST" }), params(created.metadata.id));
    assert.equal(rotated.status, 200);
    assert.match(rotated.headers.get("cache-control") ?? "", /no-store/);
    const { key } = await rotated.json() as { key: string };
    await expectDenied(created.key, 401, target.id);
    assert.equal((await request(key, target.id)).status, 200);

    const removed = await folderRoute.DELETE(new Request("http://localhost/api/app", { method: "DELETE" }), params(folder.id));
    assert.deepEqual(await removed.json(), { ok: true, movedItemIds: [target.id] });
    await expectDenied(key, 403, target.id);
  });

  await t.test("deleting a profile cascades through folders and items", async () => {
    const departing = "64000000-0000-4000-8000-000000000003";
    await sql`insert into users(id,email,name) values (${departing},'departing@example.test','Departing')`;
    const [{ id: profile }] = await sql`select provision_company_creed(${departing}) as id`;
    const folder = await repository.vaultFolderCreate(db, { userId: departing }, { strapId: profile, name: "doomed", description: "" });
    await repository.vaultCreate(db, { userId: departing }, { creedId: profile, name: "Doomed secret", description: "", secret, folderId: folder.id });
    await sql`delete from creeds where id=${profile}`;
    assert.equal((await sql`select count(*)::int as count from strap_vault_folders where strap_id=${profile}`)[0].count, 0);
    assert.equal((await sql`select count(*)::int as count from creed_vault_items where creed_id=${profile}`)[0].count, 0);
  });

  await t.test("malformed input and rate limits are uncached and never reveal secrets", async () => {
    const created = await create([item.id]);
    await expectDenied("oauth-token", 401);
    for (const body of ["null", "[]", "{}", "{"]) assert.equal((await request(created.key, item.id, body)).status, 400);
    assert.equal((await request(created.key, item.id, " ".repeat(1025))).status, 413);
    for (let i = 0; i < 200; i++) await request(created.key, "invalid");
    const response = await request(created.key);
    assert.equal(response.status, 429);
    assert.ok(response.headers.get("retry-after"));
    assert.equal((await response.text()).includes(secret), false);
  });

  await t.test("a 100-secret load followed by a run succeeds before throttling", async () => {
    const items = [];
    for (let index = 0; index < 100; index++) {
      items.push(await repository.vaultCreate(db, { userId: owner }, {
        creedId: personal, name: `Full schema ${index}`, description: "", secret,
      }));
    }
    const created = await create(items.map(item => item.id));
    for (let load = 0; load < 2; load++) {
      for (const item of items) {
        const response = await request(created.key, item.id);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { secret });
      }
    }
    const throttled = await request(created.key, items[0].id);
    assert.equal(throttled.status, 429);
    assert.ok(throttled.headers.get("retry-after"));
  });
});
