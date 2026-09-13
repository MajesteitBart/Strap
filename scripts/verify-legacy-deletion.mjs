// Run against a disposable local app using scripts/fixtures/legacy-stripe.mjs:
// node scripts/verify-legacy-deletion.mjs http://localhost:3102 <local-env-file>
// Creates and cleans up only its own synthetic account; refuses remote targets.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

function localOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(url.hostname) ||
      url.username || url.password || url.pathname !== "/") throw new Error("Local origin required.");
  return url.origin;
}
const origin = localOrigin(process.argv[2]);
const env = parseEnv(readFileSync(process.argv[3], "utf8"));
const database = localOrigin(env.NEXT_PUBLIC_SUPABASE_URL);
assert.equal(env.STRIPE_SECRET_KEY, "sk_test_local_fixture", "Fixture key required.");
const admin = createClient(database, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
let userId;
try {
  const password = randomUUID() + "aA9!";
  const email = `strap-deletion-${randomUUID()}@example.invalid`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(created.error);
  userId = created.data.user.id;
  const cookies = [];
  const client = createServerClient(database, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: { getAll: () => [], setAll: (values) => cookies.push(...values) },
  });
  assert.ifError((await client.auth.signInWithPassword({ email, password })).error);
  const company = await admin.rpc("provision_company_creed", { p_owner: userId });
  assert.ifError(company.error);
  const companyId = company.data;
  assert.ifError((await admin.from("creed_entitlements").insert({ user_id: userId, email,
    stripe_session_id: `cs_${randomUUID()}`, stripe_price_id: "price_fixture", amount_cents: 100,
    billing_mode: "subscription", status: "active", stripe_subscription_id: "sub_verification_active" })).error);
  assert.ifError((await admin.from("creed_company_billing").insert({ creed_id: companyId,
    owner_user_id: userId, billing_mode: "subscription", status: "active",
    stripe_subscription_id: "sub_verification_active" })).error);
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
  const personalState = async (id) => assert.ifError((await admin.from("creed_entitlements")
    .update({ stripe_subscription_id: id }).eq("user_id", userId)).error);
  assert.equal(await removeAccount(), 409);
  assert.equal(await removeCompany(), 409);
  assert.ifError((await admin.auth.admin.getUserById(userId)).error);
  assert.ok((await admin.from("creeds").select("id").eq("id", companyId).single()).data);
  for (const id of [null, "", "   "]) {
    await personalState(id);
    assert.equal(await removeAccount(), 409, "Incomplete Personal subscription must preserve the account.");
    assert.ifError((await admin.from("creed_company_billing").update({ stripe_subscription_id: id })
      .eq("creed_id", companyId)).error);
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
  assert.ifError((await admin.from("creed_company_billing").update({ stripe_subscription_id: "sub_verification_active" })
    .eq("creed_id", companyId)).error);
  await personalState("sub_verification_missing");
  assert.equal(await removeAccount(), 502);
  await personalState("sub_verification_canceled");
  assert.equal(await removeAccount(), 409, "Renewing Company billing must also block account deletion.");
  assert.ifError((await admin.from("creed_company_billing").update({ stripe_subscription_id: "sub_verification_scheduled" })
    .eq("creed_id", companyId)).error);
  assert.equal(await removeCompany(), 200);
  assert.equal((await admin.from("creeds").select("id").eq("id", companyId).maybeSingle()).data, null);
  assert.equal(await removeAccount(), 200);
  assert.equal((await admin.auth.admin.getUserById(userId)).data.user, null);
  userId = undefined;
  process.stdout.write("Legacy deletion API checks passed: renewal and provider errors preserve records; confirmed cancellations allow deletion.\n");
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId);
}
