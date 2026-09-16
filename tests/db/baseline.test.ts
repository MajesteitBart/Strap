import { migrate } from "drizzle-orm/postgres-js/migrator";
import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase, databaseTestsEnabled, sqlState } from "./harness.ts";

test("plain Postgres baseline and retained atomic functions", { skip: !databaseTestsEnabled }, async (t) => {
  const { db, connection: sql, close } = await createTestDatabase();
  t.after(close);
  await t.test("migration reruns without data or schema changes", async () => {
    await migrate(db, { migrationsFolder: "db/migrations" });
    const [row] = await sql`select count(*)::int as count from information_schema.tables where table_schema='public'`;
    assert.equal(row.count, 44);
    const [policies] = await sql`select count(*)::int as count from pg_policies where schemaname='public'`;
    assert.equal(policies.count, 0);
    const [references] = await sql`select count(*)::int as count from pg_constraint where contype='f' and confrelid in (select oid from pg_class where relnamespace in (select oid from pg_namespace where nspname in ('auth','vault','storage')))`;
    assert.equal(references.count, 0);
    const [functions] = await sql`select count(*)::int as count, bool_or(prosecdef) as definer from pg_proc where pronamespace='public'::regnamespace`;
    assert.equal(functions.count, 8);
    assert.equal(functions.definer, false);
  });

  const owner = "51000000-0000-4000-8000-000000000001";
  const member = "51000000-0000-4000-8000-000000000002";
  const outsider = "51000000-0000-4000-8000-000000000003";
  await sql`insert into users(id,name,email,email_verified) values
    (${owner},'Owner','owner@example.invalid',true),
    (${member},'Member','member@example.invalid',true),
    (${outsider},'Outsider','outsider@example.invalid',true)`;
  let creedId: string;
  await t.test("company provisioning is idempotent and installs its owner", async () => {
    const [first] = await sql`select provision_company_creed(${owner}) as id`;
    const [second] = await sql`select provision_company_creed(${owner}) as id`;
    creedId = first.id;
    assert.equal(first.id, second.id);
    assert.deepEqual(Array.from(await sql`select role from creed_members where creed_id=${creedId} and user_id=${owner}`), [{ role: "owner" }]);
    await assert.rejects(sql`select provision_company_creed(null)`, sqlState("22004"));
  });
  await sql`insert into creed_members(creed_id,user_id,role) values (${creedId!},${member},'member')`;
  await t.test("MCP reads require current membership and increment atomically", async () => {
    await sql`select increment_mcp_read_for_creed(${creedId!},${owner},'test-client',current_date)`;
    await sql`select increment_mcp_read_for_creed(${creedId!},${owner},'test-client',current_date)`;
    const [row] = await sql`select read_count from creed_mcp_read_events where creed_id=${creedId!}`;
    assert.equal(row.read_count, 2);
    await assert.rejects(sql`select increment_mcp_read_for_creed(${creedId!},${outsider},'test-client',current_date)`);
  });
  await t.test("ownership transfer rejects outsiders and updates both memberships", async () => {
    await assert.rejects(sql`select transfer_creed_ownership(${creedId!},${owner},${outsider})`);
    await sql`select transfer_creed_ownership(${creedId!},${owner},${member})`;
    const [row] = await sql`select owner_user_id from creeds where id=${creedId!}`;
    assert.equal(row.owner_user_id, member);
    const roles = await sql`select user_id,role from creed_members where creed_id=${creedId!} order by user_id`;
    assert.deepEqual(roles.map((row) => row.role), ["admin", "owner"]);
  });
  await t.test("device approval is consumed once and verification attempts are bounded", async () => {
    await sql`insert into oauth_clients(client_id) values ('test-client')`;
    const [client] = await sql`select redirect_uris from oauth_clients where client_id='test-client'`;
    assert.deepEqual(client.redirect_uris, []);
    await sql`insert into oauth_device_authorizations(device_code_hash,user_code_hash,client_id,expires_at,status,user_id,creed_id,mode)
      values ('device','code','test-client',now()+interval '5 minutes','approved',${member},${creedId!},'read-only'),
      ('device2','code2','test-client',now()+interval '5 minutes','pending',null,null,null)`;
    assert.equal((await sql`select * from consume_oauth_device_authorization('device','wrong-client')`)[0].outcome, "invalid_grant");
    assert.equal((await sql`select * from consume_oauth_device_authorization('device','test-client')`)[0].outcome, "approved");
    assert.equal((await sql`select * from consume_oauth_device_authorization('device','test-client')`)[0].outcome, "expired_token");
    for (let attempt = 1; attempt <= 10; attempt++) {
      const result = await sql`select * from record_oauth_device_verification('code2')`;
      assert.equal(result.length, attempt < 10 ? 1 : 0);
    }
    assert.equal((await sql`select * from consume_oauth_device_authorization('device2','test-client')`)[0].outcome, "access_denied");
  });
});
