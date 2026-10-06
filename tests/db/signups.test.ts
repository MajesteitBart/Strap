import { eq } from "drizzle-orm";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { accounts, users } from "../../db/schema/auth.ts";
import { createAuth } from "../../lib/auth/create-auth.ts";
import { password } from "../../lib/auth/password.ts";
import { areSignUpsOpen } from "../../lib/env.ts";
import { createTestDatabase, databaseTestsEnabled } from "./harness.ts";

test("signups stay closed unless STRAP_ALLOW_SIGNUPS is exactly true", () => {
  assert.equal(areSignUpsOpen({}), false);
  assert.equal(areSignUpsOpen({ STRAP_ALLOW_SIGNUPS: "1" }), false);
  assert.equal(areSignUpsOpen({ STRAP_ALLOW_SIGNUPS: "TRUE" }), false);
  assert.equal(areSignUpsOpen({ STRAP_ALLOW_SIGNUPS: "true" }), true);
});

test("with signups closed no account can be created and existing users still sign in", { skip: !databaseTestsEnabled }, async (t) => {
  const { db, close } = await createTestDatabase();
  t.after(close);
  const baseURL = "http://localhost:3000";
  const auth = createAuth(db, {
    baseURL,
    secret: randomBytes(32).toString("base64"),
    allowSignUps: false,
    sendVerificationEmail: async () => {},
    sendResetPassword: async () => {},
    socialProviders: { google: { clientId: "probe", clientSecret: "probe", disableSignUp: true } },
    logger: { disabled: true },
  });
  const post = (path: string, body: Record<string, unknown>) => auth.handler(new Request(`${baseURL}/api/auth${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: baseURL }, body: JSON.stringify(body),
  }));
  const usersWithEmail = async (email: string) => db.select().from(users).where(eq(users.email, email));

  await t.test("email signup is refused", async () => {
    const response = await post("/sign-up/email", { name: "New", email: "closed@example.invalid", password: "Strong local probe password" });
    assert.ok(response.status >= 400, `status ${response.status}`);
    assert.equal((await usersWithEmail("closed@example.invalid")).length, 0);
  });

  await t.test("the database hook stops every other path, such as a first OAuth sign-in", async () => {
    const context = await auth.$context;
    const created = await context.internalAdapter
      .createUser({ name: "OAuth", email: "oauth@example.invalid", emailVerified: true }, { method: "oauth", oauth: { providerId: "google" } })
      .catch(() => null);
    assert.equal(created ?? null, null);
    assert.equal((await usersWithEmail("oauth@example.invalid")).length, 0);
  });

  await t.test("an existing user still signs in", async () => {
    const id = randomUUID();
    await db.insert(users).values({ id, name: "Existing", email: "existing@example.invalid", emailVerified: true });
    await db.insert(accounts).values({
      id: randomUUID(), userId: id, providerId: "credential", accountId: id,
      password: await password.hash("Strong local probe password"),
    });
    const response = await post("/sign-in/email", { email: "existing@example.invalid", password: "Strong local probe password" });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).user.id, id);
  });
});
