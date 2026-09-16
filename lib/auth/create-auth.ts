// Auth configuration shared by the Next.js server and isolated integration tests.
import { betterAuth, type BetterAuthOptions, type BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema/auth.ts";
import { isLegacyPasswordHash, password } from "./password.ts";

type Mail = { user: { email: string; name: string }; url: string };
export type AuthConfiguration = {
  baseURL: string;
  secret: string;
  socialProviders?: BetterAuthOptions["socialProviders"];
  plugins?: BetterAuthPlugin[];
  sendVerificationEmail: (message: Mail) => Promise<void>;
  sendResetPassword: (message: Mail) => Promise<void>;
  logger?: BetterAuthOptions["logger"];
};

export function createAuth(db: PostgresJsDatabase, config: AuthConfiguration) {
  return betterAuth({
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
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
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
      }),
    },
    plugins: config.plugins ?? [],
    logger: config.logger,
  });
}
