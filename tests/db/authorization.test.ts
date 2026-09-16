import { and, eq, getTableName } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import assert from "node:assert/strict";
import test from "node:test";
import * as tables from "../../db/schema/application.ts";
import { authorizeValues, rowScope } from "../../lib/authz/policies.ts";
import { viewerContext, type DatabaseContext } from "../../lib/db/context.ts";
import { conflictSet, query } from "../../lib/db/query.ts";
import { companyVersionControl } from "../../lib/db/repositories/company.ts";
import { createTestDatabase, databaseTestsEnabled } from "./harness.ts";

test("former RLS policy families deny cross-user and cross-profile access", { skip: !databaseTestsEnabled }, async t => {
  const { db, connection: sql, close } = await createTestDatabase();
  t.after(close);
  const owner = "61000000-0000-4000-8000-000000000001";
  const admin = "61000000-0000-4000-8000-000000000002";
  const member = "61000000-0000-4000-8000-000000000003";
  const outsider = "61000000-0000-4000-8000-000000000004";
  for (const [id, name] of [[owner, "owner"], [admin, "admin"], [member, "member"], [outsider, "outsider"]]) await sql`insert into users(id,email,name,email_verified) values (${id},${name+'@example.test'},${name},true)`;
  const [{ id: company }] = await sql`select provision_company_creed(${owner}) as id`;
  const [{ id: personal }] = await sql`insert into creeds(type,name,owner_user_id) values ('personal','Personal',${owner}) returning id`;
  const [{ id: other }] = await sql`insert into creeds(type,name,owner_user_id) values ('personal','Other',${outsider}) returning id`;
  await sql`insert into creed_members(creed_id,user_id,role) values (${company},${admin},'admin'),(${company},${member},'member'),(${personal},${owner},'owner'),(${other},${outsider},'owner')`;
  await sql`delete from creed_sections where creed_id=${company}`;
  for (const section of ["visible", "hidden", "deleted"]) {
    await sql`insert into creed_sections(creed_id,user_id,section_id,kind,name,accent,agent_permission,last_edited_by,last_edited_type,deleted_at) values (${company},${owner},${section},'rich-text',${section},'blue','propose','Owner','user',${section==='deleted'?new Date().toISOString():null})`;
    await sql`insert into creed_proposals(id,creed_id,user_id,section_id,section_name,accent,agent_name,change_type,reason,impact,confidence) values (${section},${company},${owner},${section},${section},'blue','Agent','update','reason','small','high')`;
    await sql`insert into creed_activity(id,creed_id,user_id,section_id,actor,actor_type,summary,status) values (${section},${company},${owner},${section},'Agent','agent','update','direct')`;
    await sql`insert into creed_section_versions(creed_id,section_id,revision,name,accent,content,actor_type,cause) values (${company},${section},1,${section},'blue','content','user','manual')`;
  }
  await sql`insert into creed_activity(id,creed_id,user_id,actor,actor_type,summary,status,event_kind) values ('billing',${company},${owner},'Owner','user','billing','direct','billing')`;
  await sql`insert into creed_member_section_permissions(creed_id,user_id,section_id,permission) values (${company},${member},'hidden','hidden')`;
  await sql`insert into creed_member_agent_permissions(creed_id,user_id,section_id,permission) values (${company},${member},'visible','propose')`;
  await sql`insert into creed_invites(creed_id,email,token_hash,invited_by,expires_at) values (${company},'invite@example.test','hash',${owner},now()+interval '1 day')`;
  await sql`insert into creed_ai_settings(user_id) values (${owner})`;
  await sql`insert into creed_integrations(user_id,provider,status) values (${owner},'github','not-connected')`;
  await sql`insert into creed_tokens(user_id) values (${owner})`;
  await sql`insert into creed_version_control(user_id) values (${owner})`;
  await sql`insert into creed_getting_started(user_id) values (${owner})`;
  await sql`insert into creed_audit_log(user_id,action) values (${owner},'test')`;
  await sql`insert into creed_ai_usage(id,user_id,creed_id,feature,model_id,model_quality) values ('usage',${owner},${company},'analysis','test','test')`;
  await sql`insert into creed_company_billing(creed_id,owner_user_id,billing_mode,status) values (${company},${owner},'lifetime','paid')`;
  await sql`insert into creed_company_ai_settings(creed_id) values (${company})`;
  const viewer = (userId: string) => viewerContext(db, { userId });
  const read = (table: PgTable, context: DatabaseContext) => db.select().from(table).where(rowScope(context, table, "select"));

  await t.test("own-user settings, integrations, tokens, onboarding and audit rows stay private", async () => {
    for (const table of [tables.creed_ai_settings, tables.creed_integrations, tables.creed_tokens, tables.creed_version_control, tables.creed_getting_started, tables.creed_audit_log]) {
      assert.equal((await read(table, viewer(owner))).length, 1, getTableName(table));
      assert.equal((await read(table, viewer(outsider))).length, 0, getTableName(table));
      await assert.rejects(authorizeValues(viewer(outsider), table, "insert", { user_id: owner }));
    }
  });
  await t.test("membership scopes, hidden sections, deleted sections, proposals and history", async () => {
    assert.equal((await read(tables.creeds, viewer(member))).length, 1);
    assert.equal((await read(tables.creed_members, viewer(member))).length, 3);
    assert.deepEqual((await read(tables.creed_sections, viewer(member))).map(r=>r.section_id), ["visible"]);
    for (const table of [tables.creed_proposals, tables.creed_activity, tables.creed_section_versions]) {
      assert.equal((await read(table, viewer(outsider))).length, 0);
      assert.equal((await read(table, viewer(member))).some(r=>r.section_id === "hidden"), false);
    }
    assert.equal((await read(tables.creed_sections, viewer(admin))).length, 3);
    assert.equal((await read(tables.creed_activity, viewer(member))).some(r=>r.event_kind === "billing"), false);
    assert.equal((await read(tables.creed_activity, viewer(admin))).some(r=>r.event_kind === "billing"), true);
  });
  await t.test("owner billing, manager invitations and permission overrides have distinct scopes", async () => {
    await sql`insert into creed_company_version_control(creed_id,repo_name) values (${company},'fixture-repo')`;
    assert.equal((await companyVersionControl(db, { userId: admin }, company))?.repo_name, "fixture-repo");
    assert.equal(await companyVersionControl(db, { userId: member }, company), null);
    assert.equal(await companyVersionControl(db, { userId: outsider }, company), null);
    for (const table of [tables.creed_company_billing, tables.creed_company_ai_settings]) {
      assert.equal((await read(table, viewer(owner))).length, 1);
      assert.equal((await read(table, viewer(admin))).length, 0);
      assert.equal((await read(table, viewer(member))).length, 0);
    }
    assert.equal((await read(tables.creed_invites, viewer(admin))).length, 1);
    assert.equal((await read(tables.creed_invites, viewer(member))).length, 0);
    assert.equal((await read(tables.creed_member_section_permissions, viewer(outsider))).length, 0);
    assert.equal((await read(tables.creed_member_agent_permissions, viewer(owner))).length, 0);
    assert.equal((await read(tables.creed_member_agent_permissions, viewer(member))).length, 1);
    assert.equal((await read(tables.creed_ai_usage, viewer(member))).length, 0);
    assert.equal((await read(tables.creed_ai_usage, viewer(admin))).length, 1);
  });
  await t.test("personal writes cannot mutate Company content or steal an existing row through upsert", async () => {
    await assert.rejects(authorizeValues(viewer(member), tables.creed_sections, "insert", { creed_id: company, user_id: member }));
    await assert.rejects(authorizeValues(viewer(owner), tables.creed_sections, "update", { creed_id: other }));
    const [original] = await db.select().from(tables.creed_proposals).where(eq(tables.creed_proposals.id, "visible"));
    const values = { ...original, creed_id: other, user_id: outsider };
    const attempted = await query(viewer(outsider), tables.creed_proposals, "insert", async (database, scope) => {
      await authorizeValues(viewer(outsider), tables.creed_proposals, "insert", values);
      return database.insert(tables.creed_proposals).values(values).onConflictDoUpdate({ target: tables.creed_proposals.id, set: conflictSet(tables.creed_proposals, values), setWhere: scope });
    });
    assert.equal(attempted.error, null);
    const [unchanged] = await db.select().from(tables.creed_proposals).where(eq(tables.creed_proposals.id, "visible"));
    assert.equal(unchanged.creed_id, company);
    assert.equal((await db.delete(tables.creed_sections).where(and(rowScope(viewer(owner), tables.creed_sections, "delete"), eq(tables.creed_sections.creed_id, company))).returning()).length, 0);
  });
  await t.test("service-only and anonymous operations deny by default", async () => {
    await sql`insert into oauth_clients(client_id) values ('private-client')`;
    for (const context of [viewer(owner), { database: db, actor: { kind: "anonymous" } } as DatabaseContext]) {
      assert.equal((await read(tables.oauth_clients, context)).length, 0);
      await assert.rejects(authorizeValues(context, tables.oauth_clients, "insert", { client_id: "attempt" }));
    }
    assert.equal((await read(tables.creeds, { database: db, actor: { kind: "anonymous" } })).length, 0);
  });
  await t.test("removed membership immediately removes Company visibility", async () => {
    await sql`delete from creed_members where creed_id=${company} and user_id=${member}`;
    assert.equal((await read(tables.creed_sections, viewer(member))).length, 0);
    assert.equal((await read(tables.creed_proposals, viewer(member))).length, 0);
  });
});
