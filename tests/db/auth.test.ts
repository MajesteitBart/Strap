import { hash as bcryptHash } from "bcryptjs";
import { eq } from "drizzle-orm";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { accounts, users } from "../../db/schema/auth.ts";
import { createAuth } from "../../lib/auth/create-auth.ts";
import { isLegacyPasswordHash, password } from "../../lib/auth/password.ts";
import { createTestDatabase, databaseTestsEnabled } from "./harness.ts";

test("Better Auth migration probe on local Postgres", { skip: !databaseTestsEnabled }, async (t) => {
  const { db, connection: sql, close } = await createTestDatabase();
  t.after(close);
  const verificationUrls: string[] = [];
  const resetUrls: string[] = [];
  const baseURL = "http://localhost:3000";
  const auth = createAuth(db, {
    baseURL,
    secret: randomBytes(32).toString("base64"),
    sendVerificationEmail: async ({ url }) => { verificationUrls.push(url); },
    sendResetPassword: async ({ url }) => { resetUrls.push(url); },
    socialProviders: { google: { clientId: "probe", clientSecret: "probe" } },
    logger: { disabled: true },
  });
  const post = (path: string, body: Record<string, unknown>, cookie?: string) => auth.handler(new Request(`${baseURL}/api/auth${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: baseURL, ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body),
  }));
  let newUserId: string;
  await t.test("signup requires verification and generates UUIDs", async () => {
    const response = await post("/sign-up/email", { name: "Probe", email: "new@example.invalid", password: "Strong local probe password" });
    assert.equal(response.status, 200);
    const body = await response.json();
    newUserId = body.user.id;
    assert.match(newUserId!, /^[0-9a-f-]{36}$/);
    assert.equal(body.token, null);
    assert.equal(verificationUrls.length, 1);
    const denied = await post("/sign-in/email", { email: "new@example.invalid", password: "Strong local probe password" });
    assert.equal(denied.status, 403);
    const verified = await auth.handler(new Request(verificationUrls[0]));
    assert.ok(verified.status < 400);
    assert.equal((await db.select().from(users).where(eq(users.id, newUserId!)))[0].emailVerified, true);
  });
  await t.test("a failed Drizzle transaction rolls back every write", async () => {
    const id = randomUUID();
    await assert.rejects(db.transaction(async (tx) => {
      await tx.insert(users).values({ id, name: "Rollback", email: "rollback@example.invalid" });
      throw new Error("rollback probe");
    }));
    assert.equal((await db.select().from(users).where(eq(users.id, id))).length, 0);
  });
  const migratedId = "61000000-0000-4000-8000-000000000001";
  const legacyHash = await bcryptHash("Imported password", 10);
  await db.insert(users).values({ id: migratedId, name: "Migrated", email: "migrated@example.invalid", emailVerified: true });
  await db.insert(accounts).values([
    { id: randomUUID(), userId: migratedId, providerId: "credential", accountId: migratedId, password: legacyHash },
    { id: randomUUID(), userId: migratedId, providerId: "google", accountId: "migrated-google-subject" },
  ]);
  await t.test("wrong passwords preserve bcrypt, correct passwords preserve the user and upgrade the hash", async () => {
    const denied = await post("/sign-in/email", { email: "migrated@example.invalid", password: "Wrong password" });
    assert.equal(denied.status, 401);
    const credential = (await db.select().from(accounts).where(eq(accounts.userId, migratedId))).find((row) => row.providerId === "credential")!;
    assert.equal(credential.password, legacyHash);
    const accepted = await post("/sign-in/email", { email: "migrated@example.invalid", password: "Imported password" });
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json()).user.id, migratedId);
    const [updated] = await sql`select password from accounts where user_id=${migratedId} and provider_id='credential'`;
    assert.equal(isLegacyPasswordHash(updated.password), false);
    assert.equal(await password.verify({ hash: updated.password, password: "Imported password" }), true);
  });
  await t.test("Google resolves the imported subject to the original user", async () => {
    // Exercise Better Auth's real social sign-in and linking code with a stubbed
    // provider boundary. A real provider callback remains a rehearsal check.
    const context = await auth.$context;
    const google = context.socialProviders.find((provider) => provider.id === "google")!;
    const keys = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: "SHA-256" }, true, ["sign","verify"]);
    google.idToken = { jwks: async () => keys.publicKey, issuer: ["https://accounts.google.com"], audience: "probe" };
    const now = Math.floor(Date.now()/1000);
    const encoded = [
      { alg: "RS256", typ: "JWT", kid: "local-probe" },
      { iss: "https://accounts.google.com", aud: "probe", sub: "migrated-google-subject", email: "migrated@example.invalid", email_verified: true, name: "Provider name", iat: now, exp: now+300 },
    ].map((value) => Buffer.from(JSON.stringify(value)).toString("base64url")).join(".");
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, Buffer.from(encoded));
    const token = `${encoded}.${Buffer.from(signature).toString("base64url")}`;
    const response = await post("/sign-in/social", { provider: "google", idToken: { token } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).user.id, migratedId);
    assert.equal((await sql`select count(*)::int as count from users where email='migrated@example.invalid'`)[0].count, 1);
  });
  await t.test("reset tokens are single-use and revoke sessions", async () => {
    assert.equal((await post("/request-password-reset", { email: "migrated@example.invalid", redirectTo: `${baseURL}/reset-password` })).status, 200);
    assert.equal(resetUrls.length, 1);
    const url = new URL(resetUrls[0]);
    const token = url.pathname.split("/").at(-1)!;
    const response = await post("/reset-password", { token, newPassword: "Replaced password" });
    assert.equal(response.status, 200);
    assert.equal((await sql`select count(*)::int as count from sessions where user_id=${migratedId}`)[0].count, 0);
    assert.equal((await post("/reset-password", { token, newPassword: "Replayed password" })).status, 400);
  });
  await t.test("signout invalidates the persisted session", async () => {
    await sql`delete from auth_rate_limits`;
    const signin = await post("/sign-in/email", { email: "migrated@example.invalid", password: "Replaced password" });
    assert.equal(signin.status, 200);
    const cookie = signin.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    const session = await auth.handler(new Request(`${baseURL}/api/auth/get-session?disableCookieCache=true`, { headers: { Cookie: cookie } }));
    assert.equal((await session.json()).user.id, migratedId);
    assert.equal((await post("/sign-out", {}, cookie)).status, 200);
    const revoked = await auth.handler(new Request(`${baseURL}/api/auth/get-session?disableCookieCache=true`, { headers: { Cookie: cookie } }));
    assert.equal(await revoked.json(), null);
  });
});
