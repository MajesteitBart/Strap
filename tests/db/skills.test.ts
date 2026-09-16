import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase, databaseTestsEnabled, sqlState } from "./harness.ts";

test("shared skill membership, history and quota on plain Postgres", { skip: !databaseTestsEnabled }, async (t) => {
  const { connection: sql, close } = await createTestDatabase();
  t.after(close);
  const owner = "51000000-0000-4000-8000-000000000001";
  const member = "51000000-0000-4000-8000-000000000002";
  const outsider = "51000000-0000-4000-8000-000000000003";
  const profile = "52000000-0000-4000-8000-000000000001";
  await sql`insert into users(id,name,email) values (${owner},'Owner','skill-owner@example.invalid'),(${member},'Member','skill-member@example.invalid'),(${outsider},'Outsider','skill-outsider@example.invalid')`;
  await sql`insert into creeds(id,type,name,owner_user_id) values (${profile},'company','Skills test',${owner})`;
  await sql`insert into creed_members(creed_id,user_id,role) values (${profile},${owner},'owner'),(${profile},${member},'member')`;
  const publish = (user: string, revision: number, content: string) => sql`select strap_skill_publish(${user},${profile},'test',${revision},${content},${JSON.stringify([{path:'SKILL.md',content,encoding:'utf8',executable:false}])}::jsonb,${(revision ? 'b' : 'a').repeat(64)},${content.length}) as skill`;
  await t.test("owner publishes and member reads", async () => {
    assert.equal((await publish(owner, 0, "Test workflow"))[0].skill.revision, 1);
    const [row] = await sql`select strap_skills_read(${member},${profile}) as library`;
    assert.equal(row.library.skills.length, 1);
  });
  await t.test("outsider reads and member publication are denied", async () => {
    await assert.rejects(sql`select strap_skills_read(${outsider},${profile})`, sqlState("42501"));
    await assert.rejects(publish(member, 1, "denied"), sqlState("42501"));
  });
  await t.test("publication keeps history and rejects stale changes", async () => {
    assert.equal((await publish(owner, 1, "Changed"))[0].skill.revision, 2);
    await assert.rejects(publish(owner, 1, "Stale"), sqlState("PT409"));
    const [row] = await sql`select strap_skills_read(${owner},${profile},'test',1) as document`;
    assert.equal(row.document.skill.description, "Test workflow");
  });
  await t.test("archive retry is idempotent, admin can restore, removed members lose access", async () => {
    const archive = () => sql`select strap_skill_publish(${owner},${profile},'test',2,p_archived=>true) as skill`;
    assert.equal((await archive())[0].skill.archived, true);
    assert.equal((await archive())[0].skill.revision, 3);
    await sql`update creed_members set role='admin' where creed_id=${profile} and user_id=${member}`;
    assert.equal((await sql`select strap_skill_publish(${member},${profile},'test',3,p_archived=>false) as skill`)[0].skill.revision, 4);
    await sql`delete from creed_members where creed_id=${profile} and user_id=${member}`;
    await assert.rejects(sql`select strap_skills_read(${member},${profile})`, sqlState("42501"));
    await assert.rejects(publish(member, 4, "denied"), sqlState("42501"));
  });
  await t.test("the 64 MiB quota prunes history, preserves current revisions and rolls back overflow", async () => {
    // The original quota fixtures are intentionally large enough to cross the limit.
    await sql`delete from strap_skills where strap_id=${profile}`;
    const largeFiles = Array.from({length:4}, (_, i) => ({path:i ? `asset-${i}.txt` : 'SKILL.md',content:'x'.repeat(523264),encoding:'utf8',executable:false}));
    const largePublish = (name: string, revision: number) => sql`select strap_skill_publish(${owner},${profile},${name},${revision},'Large skill',${JSON.stringify(largeFiles)}::jsonb,${'a'.repeat(64)},2093056)`;
    for (let skill = 1; skill <= 2; skill++) for (let revision = 0; revision < 20; revision++) await largePublish(`large-${skill}`,revision);
    const usage = async () => (await sql`select (select coalesce(sum(storage_bytes),0) from strap_skills)+(select coalesce(sum(storage_bytes),0) from strap_skill_versions) as bytes`)[0].bytes;
    assert.ok(Number(await usage()) <= 67108864);
    assert.ok(Number((await sql`select count(*) as count from strap_skill_versions`)[0].count) < 40);
    assert.equal((await sql`select count(*)::int as count from strap_skills s join strap_skill_versions v on v.skill_id=s.id and v.revision=s.revision`)[0].count, 2);
    const library = (await sql`select strap_skills_read(${owner},${profile}) as library`)[0].library;
    assert.equal(library.skills.length, 2);
    assert.ok(library.skills.every((skill: Record<string, unknown>) => !("files" in skill)));
    assert.equal((await sql`select count(*)::int as count from strap_skill_versions where summary ? 'files' or octet_length(summary::text)>2048`)[0].count, 0);
    assert.equal(Number(library.storageBytes),Number(await usage()));
    for (let skill = 3; skill <= 16; skill++) await largePublish(`large-${skill}`,0);
    await assert.rejects(largePublish('large-17',0), sqlState("54000"));
    assert.equal((await sql`select count(*)::int as count from strap_skills`)[0].count, 16);
    assert.equal((await sql`select strap_skill_publish(${owner},${profile},'large-1',20,p_archived=>true) as skill`)[0].skill.revision, 21);
  });
});
