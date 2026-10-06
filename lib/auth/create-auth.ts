// Auth configuration shared by the app server and isolated integration tests.
import { betterAuth, type BetterAuthOptions, type BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema/auth.ts";
import { createMfaPolicy, mfaPlugin, type SecurityEvent } from "./mfa.ts";
import { isLegacyPasswordHash, password } from "./password.ts";

type Mail = { user: { email: string; name: string }; url: string };
export type AuthConfiguration = {
  baseURL: string;
  secret: string;
  // False blocks every way of creating an account; existing users still sign in.
  allowSignUps: boolean;
  socialProviders?: BetterAuthOptions["socialProviders"];
  plugins?: BetterAuthPlugin[];
  sendVerificationEmail: (message: Mail) => Promise<void>;
  sendResetPassword: (message: Mail) => Promise<void>;
  logger?: BetterAuthOptions["logger"];
  onSecurityEvent?: (event: SecurityEvent) => Promise<void> | void;
};

export function createAuth(db: PostgresJsDatabase, config: AuthConfiguration) {
  const mfa = createMfaPolicy({ db, api: () => auth.api, onSecurityEvent: config.onSecurityEvent });
  const auth = betterAuth({
    appName: "Strap",
    baseURL: config.baseURL,
    secret: config.secret,
    database: drizzleAdapter(db, { provider: "pg", schema, transaction: true }),
    advanced: { database: { generateId: "uuid" } },
    user: {
      modelName: "users",
      additionalFields: {
        displayName: { type: "string", required: false, input: false },
        avatarUrl: { type: "string", required: false, input: false },
      },
    },
    session: {
      modelName: "sessions",
      cookieCache: { enabled: true, maxAge: 60 },
    },
    account: {
      modelName: "accounts",
      encryptOAuthTokens: true,
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },
    verification: { modelName: "verifications" },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rateLimits",
      window: 60,
      max: 100,
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: !config.allowSignUps,
      requireEmailVerification: true,
      password,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: config.sendResetPassword,
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: config.sendVerificationEmail,
    },
    socialProviders: config.socialProviders,
    databaseHooks: {
      user: {
        create: {
          // Backstop for every path that creates an account, including a first
          // OAuth sign-in: returning false stops the insert.
          before: async () => (config.allowSignUps ? undefined : false),
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => mfa.before(ctx)),
      after: createAuthMiddleware(async (ctx) => {
        await upgradeLegacyPassword(ctx);
        // Runs before plugin hooks, so every new session passes the MFA gate.
        return mfa.after(ctx);
      }),
    },
    plugins: [mfaPlugin(), ...(config.plugins ?? [])],
    logger: config.logger,
  });
  return auth;

  async function upgradeLegacyPassword(ctx: Parameters<typeof mfa.after>[0]) {
    // verify() has no account context. Upgrade only this authenticated
    // credential, after verification and session creation have succeeded.
    if (ctx.path !== "/sign-in/email" || !ctx.context.newSession) return;
    const plaintext = ctx.body?.password;
    if (typeof plaintext !== "string") return;
    const userId = ctx.context.newSession.user.id;
    const [account] = await db.select({ id: schema.accounts.id, password: schema.accounts.password })
      .from(schema.accounts).where(and(eq(schema.accounts.userId, userId), eq(schema.accounts.providerId, "credential"))).limit(1);
    if (!account?.password || !isLegacyPasswordHash(account.password)) return;
    const hash = await password.hash(plaintext);
    // A concurrent reset wins over this migration upgrade.
    await db.update(schema.accounts).set({ password: hash, updatedAt: new Date() })
      .where(and(eq(schema.accounts.id, account.id), eq(schema.accounts.password, account.password)));
  }
}
