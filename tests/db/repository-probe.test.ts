import assert from "node:assert/strict";
import test from "node:test";
import { AccessDeniedError } from "../../lib/authz/viewer.ts";
import { findPersonalProfile, listMemberships, requireMembership } from "../../lib/db/repositories/membership.ts";
import { getCompanyWelcome, getPersonalWelcome, markCompanyWelcome, markPersonalWelcome } from "../../lib/db/repositories/welcome.ts";
import { createTestDatabase, databaseTestsEnabled } from "./harness.ts";

test("viewer-scoped membership and welcome repository probe", { skip: !databaseTestsEnabled }, async (t) => {
  const { db, connection: sql, close } = await createTestDatabase();
  t.after(close);
  const owner = { userId: "71000000-0000-4000-8000-000000000001" };
  const outsider = { userId: "71000000-0000-4000-8000-000000000002" };
  const profile = "72000000-0000-4000-8000-000000000001";
  const personal = "72000000-0000-4000-8000-000000000002";
  await sql`insert into users(id,name,email) values (${owner.userId},'Owner','owner@example.invalid'),(${outsider.userId},'Outsider','outsider@example.invalid')`;
  await sql`insert into creeds(id,type,name,owner_user_id) values (${profile},'company','Company',${owner.userId}),(${personal},'personal','Personal',${owner.userId})`;
  await sql`insert into creed_members(creed_id,user_id,role) values (${profile},${owner.userId},'owner'),(${personal},${owner.userId},'owner')`;
  await sql`insert into creed_entitlements(user_id,email,stripe_session_id,stripe_price_id,amount_cents) values (${owner.userId},'owner@example.invalid','legacy','legacy',0)`;
  await sql`insert into creed_company_billing(creed_id,owner_user_id,billing_mode,status,paid_at) values (${profile},${owner.userId},'lifetime','paid',now())`;
  await t.test("only the viewer's memberships and Personal profile are returned", async () => {
    assert.deepEqual((await listMemberships(db, owner)).map((row) => row.id), [personal,profile]);
    assert.deepEqual(await listMemberships(db, outsider), []);
    assert.equal(await findPersonalProfile(db, owner),personal);
    assert.equal(await findPersonalProfile(db, outsider),null);
    assert.equal(await requireMembership(db, owner, profile),"owner");
    await assert.rejects(requireMembership(db, outsider, profile), AccessDeniedError);
  });
  await t.test("an outsider cannot read or dismiss the owner's welcome state", async () => {
    assert.equal(await getPersonalWelcome(db, outsider),null);
    await markPersonalWelcome(db, outsider);
    assert.equal((await getPersonalWelcome(db, owner))?.welcomedAt,null);
    await assert.rejects(getCompanyWelcome(db, outsider, profile), AccessDeniedError);
    await assert.rejects(markCompanyWelcome(db, outsider, profile), AccessDeniedError);
    assert.equal((await getCompanyWelcome(db, owner, profile))?.welcomedAt,null);
    await markPersonalWelcome(db, owner);
    await markCompanyWelcome(db, owner, profile);
    assert.ok((await getPersonalWelcome(db, owner))?.welcomedAt);
    assert.ok((await getCompanyWelcome(db, owner, profile))?.welcomedAt);
  });
  await t.test("membership removal takes effect on the next call", async () => {
    await sql`delete from creed_members where creed_id=${profile} and user_id=${owner.userId}`;
    await assert.rejects(requireMembership(db, owner, profile), AccessDeniedError);
  });
});
