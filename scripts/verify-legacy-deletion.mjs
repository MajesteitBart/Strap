// Run against a disposable local app using scripts/fixtures/legacy-stripe.mjs:
// node scripts/verify-legacy-deletion.mjs http://localhost:3102 <local-env-file>
// Creates and cleans up only its own synthetic account; refuses remote targets.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import { createConnection } from "../lib/db/connection.ts";
import { hashPassword } from "better-auth/crypto";

function localOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(url.hostname) ||
      url.username || url.password || url.pathname !== "/") throw new Error("Local origin required.");
  return url.origin;
}
const origin = localOrigin(process.argv[2]);
const env = parseEnv(readFileSync(process.argv[3], "utf8"));
const database = new URL(env.DATABASE_URL);
assert.ok(["localhost", "127.0.0.1"].includes(database.hostname), "Local database required.");
assert.equal(env.STRIPE_SECRET_KEY, "sk_test_local_fixture", "Fixture key required.");
const sql = createConnection(database.toString());
async function createUser(email, password) {
  const id = randomUUID();
  await sql`insert into users(id,email,name,email_verified) values (${id},${email},'Deletion fixture',true)`;
  await sql`insert into accounts(user_id,provider_id,account_id,password) values (${id},'credential',${id},${await hashPassword(password)})`;
  return id;
}
async function signIn(email, password) {
  const response = await fetch(origin + "/api/auth/sign-in/email", {method:"POST",headers:{"content-type":"application/json",origin},body:JSON.stringify({email,password})});
  assert.equal(response.status,200);
  return response.headers.getSetCookie().map(value=>{const pair=value.split(";")[0]; const i=pair.indexOf("=");return {name:pair.slice(0,i),value:pair.slice(i+1)};});
}
let userId;
let formerOwnerId;
try {
  const password = randomUUID() + "aA9!";
  const email = `strap-deletion-${randomUUID()}@example.invalid`;
  userId = await createUser(email, password);
  const cookies = await signIn(email,password);
  const [company] = await sql`select provision_company_creed(${userId}) as id`;
  const companyId = company.id;
  const formerPassword = randomUUID() + "aA9!";
  const formerEmail = `strap-former-owner-${randomUUID()}@example.invalid`;
  formerOwnerId = await createUser(formerEmail, formerPassword);
  const formerCookies = await signIn(formerEmail,formerPassword);
  await sql`insert into creed_entitlements(user_id,email,stripe_session_id,stripe_price_id,amount_cents,billing_mode,status,stripe_subscription_id) values (${userId},${email},${`cs_${randomUUID()}`},'price_fixture',100,'subscription','active','sub_verification_active')`;
  await sql`insert into creed_company_billing(creed_id,owner_user_id,billing_mode,status,stripe_subscription_id) values (${companyId},${formerOwnerId},'subscription','active','sub_verification_active')`;
  async function remove(path, body) {
    const response = await fetch(origin + path, { method: "DELETE", redirect: "error",
      headers: { "Content-Type": "application/json", Cookie: cookies.map(({ name, value }) => `${name}=${value}`).join("; ") },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    const payload = await response.json();
    assert.doesNotMatch(JSON.stringify(payload), /sub_verification|sk_test/);
    return response.status;
  }
  const removeAccount = () => remove("/api/app/account");
  const removeCompany = () => remove("/api/app/company", { strapId: companyId });
  const personalState = async (id) => sql`update creed_entitlements set stripe_subscription_id=${id} where user_id=${userId}`;
  const formerHeaders = { "Content-Type": "application/json",
    Cookie: formerCookies.map(({ name, value }) => `${name}=${value}`).join("; ") };
  const formerLookup = await fetch(origin + "/api/app/legacy-subscriptions", { headers: formerHeaders });
  assert.equal(formerLookup.status, 200);
  const formerNotices = await formerLookup.json();
  assert.equal(formerNotices.subscriptions.length, 0, "Historical billing ownership must not grant access.");
  assert.equal(formerNotices.failures.length, 0);
  const forbidden = await fetch(origin + "/api/app/legacy-subscriptions", { method: "DELETE", headers: formerHeaders,
    body: JSON.stringify({ scope: "company", strapId: companyId }) });
  assert.equal(forbidden.status, 404, "A previous owner must not cancel the current Company's subscription.");
  assert.equal(await remove("/api/app/legacy-subscriptions", { scope: "company", strapId: companyId }), 200,
    "The current owner can cancel despite stale billing ownership.");
  assert.equal((await sql`select cancel_at_period_end from creed_company_billing where creed_id=${companyId}`)[0].cancel_at_period_end, true);
  assert.equal(await removeAccount(), 409);
  assert.equal(await removeCompany(), 409);
  assert.equal((await sql`select id from users where id=${userId}`).length,1);
  assert.equal((await sql`select id from creeds where id=${companyId}`).length,1);
  for (const id of [null, "", "   "]) {
    await personalState(id);
    assert.equal(await removeAccount(), 409, "Incomplete Personal subscription must preserve the account.");
    await sql`update creed_company_billing set stripe_subscription_id=${id} where creed_id=${companyId}`;
    assert.equal(await removeCompany(), 409, "Incomplete Company subscription must preserve the Company.");
    const lookup = await fetch(origin + "/api/app/legacy-subscriptions", {
      headers: { Cookie: cookies.map(({ name, value }) => `${name}=${value}`).join("; ") },
    });
    assert.equal(lookup.status, 200);
    const notices = await lookup.json();
    assert.equal(notices.failures.filter((failure) => failure.requiresSupport).length, 2,
      "Both incomplete profiles must retain a support path in Settings.");
    assert.ok(notices.failures.some((failure) => failure.scope === "personal" && failure.strapId === null));
    assert.ok(notices.failures.some((failure) => failure.scope === "company" && failure.strapId === companyId));
  }
  await sql`update creed_company_billing set stripe_subscription_id=${"sub_verification_active"} where creed_id=${companyId}`;
  await personalState("sub_verification_missing");
  assert.equal(await removeAccount(), 502);
  await personalState("sub_verification_canceled");
  assert.equal(await removeAccount(), 409, "Renewing Company billing must also block account deletion.");
  await sql`update creed_company_billing set stripe_subscription_id=${"sub_verification_scheduled"} where creed_id=${companyId}`;
  assert.equal(await removeCompany(), 200);
  assert.equal((await sql`select id from creeds where id=${companyId}`).length,0);
  assert.equal(await removeAccount(), 200);
  assert.equal((await sql`select id from users where id=${userId}`).length,0);
  userId = undefined;
  process.stdout.write("Legacy deletion API checks passed: renewal and provider errors preserve records; confirmed cancellations allow deletion.\n");
} finally {
  if (userId) await sql`delete from users where id=${userId}`;
  if (formerOwnerId) await sql`delete from users where id=${formerOwnerId}`;
  await sql.end();
}
