// Account MFA behavior against real Better Auth endpoints and local Postgres.
import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";
import { createEmailVerificationToken } from "better-auth/api";
import { eq } from "drizzle-orm";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { accounts, twoFactors, users } from "../../db/schema/auth.ts";
import { createAuth } from "../../lib/auth/create-auth.ts";
import type { SecurityEvent } from "../../lib/auth/mfa.ts";
import { password } from "../../lib/auth/password.ts";
import { createTestDatabase, databaseTestsEnabled } from "./harness.ts";

const baseURL = "http://localhost:3000";
const EMAIL = "mfa@example.invalid";
const PASSWORD = "Strong local MFA password";

// Minimal cookie jar: later Set-Cookie headers win and expired cookies drop out.
class Jar {
  values = new Map<string, string>();
  store(response: Response) {
    for (const header of response.headers.getSetCookie()) {
      const [pair, ...attributes] = header.split(";");
      const index = pair.indexOf("=");
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      const expired = attributes.some((a) => /^\s*max-age=0\s*$/i.test(a)) || value === "";
      if (expired) this.values.delete(name);
      else this.values.set(name, value);
    }
    return response;
  }
  header() {
    return [...this.values].map(([name, value]) => `${name}=${value}`).join("; ");
  }
  has(fragment: string) {
    return [...this.values.keys()].some((name) => name.includes(fragment));
  }
}

test("account MFA on local Postgres", { skip: !databaseTestsEnabled }, async (t) => {
  const { db, connection: sql, close } = await createTestDatabase();
  t.after(close);
  const events: SecurityEvent[] = [];
  const auth = createAuth(db, {
    baseURL,
    secret: randomBytes(32).toString("base64"),
    sendVerificationEmail: async () => {},
    sendResetPassword: async () => {},
    socialProviders: { google: { clientId: "probe", clientSecret: "probe" } },
    logger: { disabled: true },
    onSecurityEvent: (event) => { events.push(event); },
  });
  const context = await auth.$context;
  const request = (path: string, init: { method?: string; body?: Record<string, unknown>; jar?: Jar; ip?: string } = {}) => {
    const headers: Record<string, string> = { Origin: baseURL };
    if (init.body) headers["Content-Type"] = "application/json";
    if (init.jar) headers.Cookie = init.jar.header();
    if (init.ip) headers["X-Forwarded-For"] = init.ip;
    return auth.handler(new Request(`${baseURL}/api/auth${path}`, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers,
      body: init.body ? JSON.stringify(init.body) : undefined,
      redirect: "manual",
    })).then((response) => (init.jar ? init.jar.store(response) : response));
  };
  // Requests without a client IP share one bucket; isolate each behavior.
  const resetRateLimits = () => sql`delete from auth_rate_limits`;
  const currentUser = async (jar: Jar) => {
    const response = await request("/get-session?disableCookieCache=true", { jar });
    const body = await response.json() as { user?: { id: string } } | null;
    return body?.user?.id ?? null;
  };
  const signIn = async () => {
    const jar = new Jar();
    await resetRateLimits();
    const response = await request("/sign-in/email", { body: { email: EMAIL, password: PASSWORD }, jar });
    return { jar, response, body: await response.json() as Record<string, unknown> };
  };
  const sessionCount = async () => (await sql`select count(*)::int as count from sessions where user_id=${userId}`)[0].count as number;

  const userId = randomUUID();
  await db.insert(users).values({ id: userId, name: "MFA", email: EMAIL, emailVerified: true });
  await db.insert(accounts).values([
    { id: randomUUID(), userId, providerId: "credential", accountId: userId, password: await password.hash(PASSWORD) },
    { id: randomUUID(), userId, providerId: "google", accountId: "mfa-google-subject" },
  ]);

  let secret = "";
  let backupCodes: string[] = [];
  const used = new Set<string>();
  // Returns a TOTP code valid now that no earlier step has presented.
  const freshCode = async () => {
    for (let wait = 0; wait < 35; wait += 1) {
      const counter = Math.floor(Date.now() / 30_000);
      for (const offset of [0, 1, -1]) {
        const code = await createOTP(secret, { period: 30, digits: 6 }).hotp(counter + offset);
        if (!used.has(code)) {
          used.add(code);
          return code;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error("No unused TOTP code became available.");
  };
  // Distinct invalid codes, so each one reaches the verifier instead of the replay guard.
  let wrongSeed = 0;
  const wrongCode = async () => {
    const counter = Math.floor(Date.now() / 30_000);
    const valid = new Set(await Promise.all([-1, 0, 1].map((o) => createOTP(secret, { period: 30, digits: 6 }).hotp(counter + o))));
    for (;;) {
      const code = String(wrongSeed++).padStart(6, "0");
      if (!valid.has(code)) return code;
    }
  };

  const primary = await signIn();
  assert.equal(primary.response.status, 200);
  assert.equal(await currentUser(primary.jar), userId);
  const older = await signIn();
  assert.equal(await currentUser(older.jar), userId);

  await t.test("a revoked session cannot enroll while its cookie cache is still valid", async () => {
    const revoked = await signIn();
    assert.ok(revoked.jar.has("session_data"), "the cookie cache is in play");
    const token = decodeURIComponent([...revoked.jar.values].find(([name]) => name.endsWith("session_token"))![1]).split(".")[0];
    await sql`delete from sessions where token=${token}`;
    await resetRateLimits();
    assert.equal((await request("/two-factor/enable", { body: { password: PASSWORD }, jar: revoked.jar })).status, 401);
    assert.equal((await db.select().from(twoFactors).where(eq(twoFactors.userId, userId))).length, 0);
  });

  await t.test("a session revoked during enrollment cannot activate the factor", async () => {
    const enrolling = await signIn();
    await resetRateLimits();
    const enabled = await request("/two-factor/enable", { body: { password: PASSWORD }, jar: enrolling.jar });
    assert.equal(enabled.status, 200);
    const pendingSecret = new TextDecoder().decode(base32.decode(new URL((await enabled.json() as { totpURI: string }).totpURI).searchParams.get("secret")!));
    const token = decodeURIComponent([...enrolling.jar.values].find(([name]) => name.endsWith("session_token"))![1]).split(".")[0];
    await sql`delete from sessions where token=${token}`;
    const before = await sessionCount();
    assert.ok(enrolling.jar.has("session_data"), "the cookie cache still vouches for the revoked session");
    await resetRateLimits();
    const code = await createOTP(pendingSecret, { period: 30, digits: 6 }).totp();
    assert.equal((await request("/two-factor/verify-totp", { body: { code }, jar: enrolling.jar })).status, 401);
    assert.equal((await db.select().from(users).where(eq(users.id, userId)))[0].twoFactorEnabled, false);
    assert.equal(await sessionCount(), before, "no replacement session was minted");
    assert.equal(await currentUser(enrolling.jar), null);
  });

  await t.test("enrollment needs the password and proof before activation", async () => {
    await resetRateLimits();
    assert.equal((await request("/two-factor/enable", { body: { password: "Wrong password" }, jar: primary.jar })).status, 400);
    await resetRateLimits();
    const enabled = await request("/two-factor/enable", { body: { password: PASSWORD }, jar: primary.jar });
    assert.equal(enabled.status, 200);
    const body = await enabled.json() as { totpURI: string; backupCodes: string[] };
    // The URI carries the base32 form an authenticator app scans.
    secret = new TextDecoder().decode(base32.decode(new URL(body.totpURI).searchParams.get("secret")!));
    backupCodes = body.backupCodes;
    assert.ok(secret);
    assert.equal(backupCodes.length, 10);
    const [row] = await db.select().from(twoFactors).where(eq(twoFactors.userId, userId));
    assert.equal(row.verified, false);
    assert.notEqual(row.secret, secret, "the factor secret is stored encrypted");
    assert.ok(!backupCodes.some((code) => row.backupCodes.includes(code)), "recovery codes are stored encrypted");
    assert.equal((await db.select().from(users).where(eq(users.id, userId)))[0].twoFactorEnabled, false);
    // An unproven enrollment does not gate sign-in yet.
    const beforeProof = await signIn();
    assert.equal(await currentUser(beforeProof.jar), userId);
    await request("/sign-out", { body: {}, jar: beforeProof.jar });
  });

  await t.test("the setup key cannot be read back after enrollment", async () => {
    await resetRateLimits();
    const response = await request("/two-factor/get-totp-uri", { body: { password: PASSWORD }, jar: primary.jar });
    assert.equal(response.status, 403);
  });

  await t.test("a wrong code does not activate; a valid code activates and revokes older sessions", async () => {
    await resetRateLimits();
    assert.equal((await request("/two-factor/verify-totp", { body: { code: await wrongCode() }, jar: primary.jar })).status, 401);
    assert.equal((await db.select().from(users).where(eq(users.id, userId)))[0].twoFactorEnabled, false);
    await resetRateLimits();
    const code = await freshCode();
    const verified = await request("/two-factor/verify-totp", { body: { code }, jar: primary.jar });
    assert.equal(verified.status, 200);
    assert.equal((await db.select().from(users).where(eq(users.id, userId)))[0].twoFactorEnabled, true);
    assert.equal((await db.select().from(twoFactors).where(eq(twoFactors.userId, userId)))[0].verified, true);
    assert.equal(await currentUser(primary.jar), userId, "the enrolling session is rotated, not lost");
    assert.equal(await currentUser(older.jar), null, "single-factor sessions are revoked");
    assert.equal(await sessionCount(), 1);
    await resetRateLimits();
    assert.equal((await request("/two-factor/verify-totp", { body: { code }, jar: primary.jar })).status, 401, "replayed code");
    assert.ok(events.some((e) => e.action === "mfa.enabled" && e.userId === userId));
    assert.ok(events.some((e) => e.action === "mfa.replay_rejected"));
  });

  await t.test("password sign-in is held until the TOTP challenge passes", async () => {
    const before = await sessionCount();
    const pending = await signIn();
    assert.equal(pending.response.status, 200);
    assert.equal(pending.body.twoFactorRedirect, true);
    assert.equal(pending.body.token, undefined);
    assert.equal(await currentUser(pending.jar), null);
    assert.equal(await sessionCount(), before, "no usable session exists before MFA");
    assert.ok(pending.jar.has("two_factor"));
    await resetRateLimits();
    assert.equal((await request("/two-factor/verify-totp", { body: { code: await freshCode(), trustDevice: true }, jar: pending.jar })).status, 400);
    await resetRateLimits();
    assert.equal((await request("/two-factor/verify-totp", { body: { code: await wrongCode() }, jar: pending.jar })).status, 401);
    await resetRateLimits();
    const code = await freshCode();
    const passed = await request("/two-factor/verify-totp", { body: { code }, jar: pending.jar });
    assert.equal(passed.status, 200);
    assert.equal(await currentUser(pending.jar), userId);
    assert.ok(!pending.jar.has("two_factor"), "the challenge cookie is cleared");

    const replay = await signIn();
    await resetRateLimits();
    assert.equal((await request("/two-factor/verify-totp", { body: { code }, jar: replay.jar })).status, 401, "a code cannot be replayed on a new challenge");
    assert.equal(await currentUser(replay.jar), null);
  });

  await t.test("a challenge allows five attempts and expires", async () => {
    const pending = await signIn();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await resetRateLimits();
      assert.equal((await request("/two-factor/verify-totp", { body: { code: await wrongCode() }, jar: pending.jar })).status, 401);
    }
    await resetRateLimits();
    const locked = await request("/two-factor/verify-totp", { body: { code: await wrongCode() }, jar: pending.jar });
    assert.equal(locked.status, 400);
    await resetRateLimits();
    assert.equal((await request("/two-factor/verify-backup-code", { body: { code: backupCodes[0] }, jar: pending.jar })).status, 401, "exhausted challenge");
    // Consecutive failures count toward the account lockout; clear them for later steps.
    await sql`update two_factors set failed_verification_count=0, locked_until=null where user_id=${userId}`;

    const expired = await signIn();
    await sql`update verifications set expires_at=now() - interval '1 second' where identifier like '2fa-%'`;
    await resetRateLimits();
    assert.equal((await request("/two-factor/verify-backup-code", { body: { code: backupCodes[0] }, jar: expired.jar })).status, 401, "expired challenge");
    assert.equal(await currentUser(expired.jar), null);
  });

  await t.test("MFA challenges are rate limited per client", async () => {
    const pending = await signIn();
    await resetRateLimits();
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      statuses.push((await request("/two-factor/verify-backup-code", { body: { code: "nope" }, jar: pending.jar, ip: "203.0.113.7" })).status);
    }
    assert.deepEqual(statuses.slice(0, 3), [401, 401, 401]);
    assert.equal(statuses[3], 429);
    await sql`update two_factors set failed_verification_count=0, locked_until=null where user_id=${userId}`;
  });

  await t.test("a recovery code signs in once", async () => {
    const pending = await signIn();
    await resetRateLimits();
    const recovered = await request("/two-factor/verify-backup-code", { body: { code: backupCodes[0] }, jar: pending.jar });
    assert.equal(recovered.status, 200);
    assert.equal(await currentUser(pending.jar), userId);
    const again = await signIn();
    await resetRateLimits();
    assert.equal((await request("/two-factor/verify-backup-code", { body: { code: backupCodes[0] }, jar: again.jar })).status, 401);
    assert.equal(await currentUser(again.jar), null);
    assert.ok(events.some((e) => e.action === "mfa.challenge_passed" && e.metadata?.method === "recovery_code"));
  });

  await t.test("Google ID-token sign-in cannot bypass MFA", async () => {
    const google = context.socialProviders.find((provider) => provider.id === "google")!;
    const keys = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
    google.idToken = { jwks: async () => keys.publicKey, issuer: ["https://accounts.google.com"], audience: "probe" };
    const now = Math.floor(Date.now() / 1000);
    const encoded = [
      { alg: "RS256", typ: "JWT", kid: "local-probe" },
      { iss: "https://accounts.google.com", aud: "probe", sub: "mfa-google-subject", email: EMAIL, email_verified: true, name: "MFA", iat: now, exp: now + 300 },
    ].map((value) => Buffer.from(JSON.stringify(value)).toString("base64url")).join(".");
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, Buffer.from(encoded));
    const jar = new Jar();
    const before = await sessionCount();
    await resetRateLimits();
    const response = await request("/sign-in/social", { body: { provider: "google", idToken: { token: `${encoded}.${Buffer.from(signature).toString("base64url")}` } }, jar });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).twoFactorRedirect, true);
    assert.equal(await currentUser(jar), null);
    assert.equal(await sessionCount(), before);
  });

  await t.test("the Google OAuth callback redirects to the challenge instead of signing in", async () => {
    const google = context.socialProviders.find((provider) => provider.id === "google")!;
    google.validateAuthorizationCode = async () => ({ accessToken: "probe-access", tokenType: "Bearer", accessTokenExpiresAt: new Date(Date.now() + 3_600_000), scopes: ["email"] });
    google.getUserInfo = async () => ({ user: { email: EMAIL, emailVerified: true, name: "MFA" }, data: { sub: "mfa-google-subject" } });
    const jar = new Jar();
    await resetRateLimits();
    const started = await request("/sign-in/social", { body: { provider: "google", callbackURL: "/authorize?client_id=probe" }, jar });
    assert.equal(started.status, 200);
    const state = new URL((await started.json()).url).searchParams.get("state")!;
    const before = await sessionCount();
    await resetRateLimits();
    const callback = await request(`/callback/google?code=probe&state=${encodeURIComponent(state)}`, { jar });
    assert.equal(callback.status, 302);
    const location = new URL(callback.headers.get("location")!);
    assert.equal(location.pathname, "/login/two-factor", location.search);
    assert.equal(location.searchParams.get("next"), "/authorize?client_id=probe");
    assert.equal(await currentUser(jar), null);
    assert.equal(await sessionCount(), before);
    await resetRateLimits();
    assert.equal((await request("/two-factor/verify-totp", { body: { code: await freshCode() }, jar })).status, 200);
    assert.equal(await currentUser(jar), userId);
  });

  await t.test("email verification auto sign-in cannot bypass MFA", async () => {
    // An unverified address makes Better Auth auto sign in after verification.
    await sql`update users set email_verified=false where id=${userId}`;
    const token = await createEmailVerificationToken(context.secret, EMAIL);
    const jar = new Jar();
    const before = await sessionCount();
    await resetRateLimits();
    const response = await request(`/verify-email?token=${token}&callbackURL=${encodeURIComponent("/file")}`, { jar });
    assert.equal(response.status, 302);
    const location = new URL(response.headers.get("location")!);
    assert.equal(location.pathname, "/login/two-factor");
    assert.equal(location.searchParams.get("next"), "/file");
    assert.equal((await db.select().from(users).where(eq(users.id, userId)))[0].emailVerified, true);
    assert.equal(await currentUser(jar), null);
    assert.equal(await sessionCount(), before);
  });

  await t.test("factor management requires a current factor", async () => {
    const jar = primary.jar;
    await resetRateLimits();
    const noFactor = await request("/two-factor/disable", { body: { password: PASSWORD }, jar });
    assert.equal(noFactor.status, 403);
    await resetRateLimits();
    assert.equal((await request("/two-factor/disable", { body: { password: PASSWORD, code: await wrongCode() }, jar })).status, 403);
    await resetRateLimits();
    assert.equal((await request("/two-factor/generate-backup-codes", { body: { password: PASSWORD }, jar })).status, 403);
    assert.equal((await db.select().from(users).where(eq(users.id, userId)))[0].twoFactorEnabled, true);
    assert.ok(events.some((e) => e.action === "mfa.step_up_failed"));

    await resetRateLimits();
    const regenerated = await request("/two-factor/generate-backup-codes", { body: { password: PASSWORD, code: await freshCode() }, jar });
    assert.equal(regenerated.status, 200);
    const fresh = (await regenerated.json() as { backupCodes: string[] }).backupCodes;
    assert.equal(fresh.length, 10);
    const stale = backupCodes[1];
    backupCodes = fresh;
    const pending = await signIn();
    await resetRateLimits();
    assert.equal((await request("/two-factor/verify-backup-code", { body: { code: stale }, jar: pending.jar })).status, 401, "old recovery codes stop working");

    await resetRateLimits();
    assert.equal((await request("/two-factor/disable", { body: { password: "Wrong password", code: backupCodes[0] }, jar })).status, 400);
    await resetRateLimits();
    // The wrong-password attempt must not have spent the recovery code.
    const disabled = await request("/two-factor/disable", { body: { password: PASSWORD, code: backupCodes[0] }, jar });
    assert.equal(disabled.status, 200);
    assert.equal((await db.select().from(users).where(eq(users.id, userId)))[0].twoFactorEnabled, false);
    assert.equal((await db.select().from(twoFactors).where(eq(twoFactors.userId, userId))).length, 0);
    const plain = await signIn();
    assert.equal(await currentUser(plain.jar), userId);
    assert.ok(events.some((e) => e.action === "mfa.disabled"));
    assert.ok(events.some((e) => e.action === "mfa.recovery_codes_regenerated"));
  });

  await t.test("security events never carry codes or secrets", async () => {
    const serialized = JSON.stringify(events.map(({ request: _request, ...event }) => event));
    for (const value of [secret, ...backupCodes, ...used]) assert.ok(!serialized.includes(value));
    assert.ok(events.every((event) => event.userId === userId));
    assert.equal((await sql`select count(*)::int as count from sessions where user_id=${userId} and expires_at < now()`)[0].count, 0);
  });
});
