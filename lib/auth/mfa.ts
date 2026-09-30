// Account MFA policy on top of Better Auth's maintained two-factor plugin:
// authenticator-app TOTP plus encrypted, single-use recovery codes. Enrollment
// is optional; once enabled, every new session for the account needs the factor.
import type { GenericEndpointContext } from "@better-auth/core";
import { APIError, getSessionFromCtx, isAPIError } from "better-auth/api";
import { deleteSessionCookie } from "better-auth/cookies";
import { generateRandomString } from "better-auth/crypto";
import { twoFactor } from "better-auth/plugins/two-factor";
import { and, eq, lt, ne } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { createHmac } from "node:crypto";
import { sessions, totpReplayClaims, users } from "../../db/schema/auth.ts";

export type SecurityEventAction =
  | "mfa.enrollment_started"
  | "mfa.enabled"
  | "mfa.disabled"
  | "mfa.recovery_codes_regenerated"
  | "mfa.challenge_issued"
  | "mfa.challenge_passed"
  | "mfa.challenge_failed"
  | "mfa.replay_rejected"
  | "mfa.step_up_failed";

// Metadata never carries codes, secrets or tokens.
export type SecurityEvent = {
  userId: string;
  action: SecurityEventAction;
  metadata?: Record<string, string | number | boolean>;
  request?: Request;
};

type Context = GenericEndpointContext;
type VerifyApi = {
  verifyTOTP: (input: { headers: Headers; body: { code: string } }) => Promise<unknown>;
  verifyBackupCode: (input: { headers: Headers; body: { code: string; disableSession: boolean } }) => Promise<unknown>;
};

// The challenge cookie and records match the plugin's own format, so its
// verify endpoints complete challenges issued by this gate.
const CHALLENGE_COOKIE = "two_factor";
const CHALLENGE_TTL_SECONDS = 600;
const TOTP_PERIOD_SECONDS = 30;
// verify() accepts one step either side; keep claims a little past that window.
const REPLAY_CLAIM_MS = (3 * TOTP_PERIOD_SECONDS + 30) * 1000;
const STEP_UP_PATHS = new Set(["/two-factor/disable", "/two-factor/generate-backup-codes"]);
const VERIFY_PATHS = new Set(["/two-factor/verify-totp", "/two-factor/verify-backup-code"]);
export const TWO_FACTOR_CHALLENGE_PATH = "/login/two-factor";

export function mfaPlugin() {
  return twoFactor({
    issuer: "Strap",
    twoFactorTable: "twoFactors",
    // Passwordless (Google/X-only) accounts can enroll. Accounts with a password
    // must still enter it; the factor step-up below applies to everyone.
    allowPasswordless: true,
    twoFactorCookieMaxAge: CHALLENGE_TTL_SECONDS,
    totpOptions: { period: TOTP_PERIOD_SECONDS, digits: 6 },
    backupCodeOptions: { amount: 10, length: 10, storeBackupCodes: "encrypted" },
    accountLockout: { enabled: true, maxFailedAttempts: 10, durationSeconds: 900 },
  });
}

export function createMfaPolicy(input: {
  db: PostgresJsDatabase;
  api: () => VerifyApi;
  onSecurityEvent?: (event: SecurityEvent) => Promise<void> | void;
}) {
  const { db } = input;
  const emit = async (ctx: Context, event: Omit<SecurityEvent, "request">) => {
    try {
      await input.onSecurityEvent?.({ ...event, request: ctx.request });
    } catch {
      // Audit delivery must not change the authentication outcome.
    }
  };

  async function sessionIsLive(token: string) {
    const [row] = await db.select({ expiresAt: sessions.expiresAt }).from(sessions).where(eq(sessions.token, token)).limit(1);
    return Boolean(row && row.expiresAt > new Date());
  }

  async function challengeUserId(ctx: Context) {
    const cookie = ctx.context.createAuthCookie(CHALLENGE_COOKIE);
    const identifier = await ctx.getSignedCookie(cookie.name, ctx.context.secret);
    if (!identifier) return null;
    const record = await ctx.context.internalAdapter.findVerificationValue(identifier);
    return record && record.expiresAt > new Date() ? record.value : null;
  }

  // Claims a TOTP code for a user. Returns false when the code was already
  // presented inside its validity window.
  async function claimTotp(ctx: Context, userId: string, code: string) {
    const codeHash = createHmac("sha256", ctx.context.secret).update(`totp:${userId}:${code}`).digest("base64url");
    await db.delete(totpReplayClaims).where(and(eq(totpReplayClaims.userId, userId), lt(totpReplayClaims.expiresAt, new Date())));
    const claimed = await db.insert(totpReplayClaims)
      .values({ userId, codeHash, expiresAt: new Date(Date.now() + REPLAY_CLAIM_MS) })
      .onConflictDoNothing()
      .returning({ userId: totpReplayClaims.userId });
    return claimed.length === 1;
  }

  async function rejectReplay(ctx: Context, userId: string, code: string) {
    if (await claimTotp(ctx, userId, code)) return;
    await emit(ctx, { userId, action: "mfa.replay_rejected" });
    throw APIError.from("UNAUTHORIZED", { message: "Invalid code", code: "INVALID_CODE" });
  }

  // Disabling MFA or regenerating recovery codes needs a recent session, the
  // password when the account has one (plugin) and a current factor (here).
  async function requireCurrentFactor(ctx: Context) {
    // Bypass the cookie cache so revoked sessions cannot manage factors.
    const session = await getSessionFromCtx(ctx, { disableCookieCache: true });
    if (!session) throw APIError.from("UNAUTHORIZED", { message: "Sign in again.", code: "UNAUTHORIZED" });
    const freshAgeMs = (ctx.context.sessionConfig.freshAge ?? 0) * 1000;
    if (freshAgeMs > 0 && Date.now() - new Date(session.session.createdAt).getTime() > freshAgeMs) {
      throw APIError.from("FORBIDDEN", { message: "Sign in again to change two-factor settings.", code: "SESSION_NOT_FRESH" });
    }
    const [account] = await db.select({ enabled: users.twoFactorEnabled }).from(users).where(eq(users.id, session.user.id)).limit(1);
    // A pending, unverified enrollment protects nothing yet and can be cancelled.
    if (!account?.enabled) return;
    const code = typeof ctx.body?.code === "string" ? ctx.body.code.trim() : "";
    const headers = ctx.headers ?? new Headers();
    try {
      if (/^\d{6}$/.test(code)) {
        // Routed through the plugin so its verification and our replay claim apply.
        await input.api().verifyTOTP({ headers, body: { code } });
        return;
      }
      if (code) {
        await input.api().verifyBackupCode({ headers, body: { code, disableSession: true } });
        return;
      }
    } catch {
      // Fall through to one generic rejection.
    }
    await emit(ctx, { userId: session.user.id, action: "mfa.step_up_failed", metadata: { operation: ctx.path } });
    throw APIError.from("FORBIDDEN", {
      message: "Enter a current authenticator code or an unused recovery code.",
      code: "MFA_STEP_UP_REQUIRED",
    });
  }

  const before = async (ctx: Context) => {
    const path = ctx.path;
    if (!path?.startsWith("/two-factor/")) return;
    // Setup keys are shown once during enrollment and never again.
    if (path === "/two-factor/get-totp-uri") {
      throw APIError.from("FORBIDDEN", { message: "The setup key is only shown during enrollment.", code: "TOTP_URI_UNAVAILABLE" });
    }
    if (VERIFY_PATHS.has(path) && ctx.body?.trustDevice) {
      // Trusted devices would let a later sign-in skip the factor.
      throw APIError.from("BAD_REQUEST", { message: "Trusted devices are not supported.", code: "TRUST_DEVICE_UNSUPPORTED" });
    }
    if (path === "/two-factor/verify-totp" && typeof ctx.body?.code === "string") {
      const session = await getSessionFromCtx(ctx);
      const userId = session?.user.id ?? await challengeUserId(ctx);
      if (userId) await rejectReplay(ctx, userId, ctx.body.code.trim());
      return;
    }
    if (path === "/two-factor/enable" && !await getSessionFromCtx(ctx, { disableCookieCache: true })) {
      // Revoked sessions stay in the cookie cache briefly; they must not enroll a factor.
      throw APIError.from("UNAUTHORIZED", { message: "Sign in again.", code: "UNAUTHORIZED" });
    }
    if (STEP_UP_PATHS.has(path)) await requireCurrentFactor(ctx);
  };

  // Better Auth's plugin only guards credential sign-in paths. This converts a
  // fresh session from any sign-in method (email, Google/X callback, ID token,
  // email verification) into a pending challenge before it is usable.
  async function gateNewSession(ctx: Context) {
    const fresh = ctx.context.newSession;
    if (!fresh || ctx.path?.startsWith("/two-factor/")) return;
    const [account] = await db.select({ enabled: users.twoFactorEnabled }).from(users).where(eq(users.id, fresh.user.id)).limit(1);
    if (!account?.enabled) return;
    // Rotations for the already-authenticated user (refresh, password change).
    // The current session must still exist, not only in the 60s cookie cache.
    const current = ctx.context.session;
    if (current?.user.id === fresh.user.id && await sessionIsLive(current.session.token)) return;

    deleteSessionCookie(ctx, true);
    await ctx.context.internalAdapter.deleteSession(fresh.session.token);
    ctx.context.setNewSession(null);
    const identifier = `2fa-${generateRandomString(20)}`;
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000);
    await ctx.context.internalAdapter.createVerificationValue({ value: fresh.user.id, identifier, expiresAt });
    await ctx.context.internalAdapter.createVerificationValue({ value: "0", identifier: `2fa-attempts-${identifier}`, expiresAt });
    const cookie = ctx.context.createAuthCookie(CHALLENGE_COOKIE, { maxAge: CHALLENGE_TTL_SECONDS });
    await ctx.setSignedCookie(cookie.name, identifier, ctx.context.secret, cookie.attributes);
    await emit(ctx, { userId: fresh.user.id, action: "mfa.challenge_issued", metadata: { entry: ctx.path ?? "unknown" } });

    const destination = redirectLocation(returnedValue(ctx));
    if (destination !== null) {
      const origin = new URL(ctx.context.baseURL).origin;
      const target = new URL(destination, origin);
      const next = target.origin === origin ? `${target.pathname}${target.search}${target.hash}` : "/";
      throw ctx.redirect(`${origin}${TWO_FACTOR_CHALLENGE_PATH}?next=${encodeURIComponent(next)}`);
    }
    return ctx.json({ twoFactorRedirect: true, twoFactorMethods: ["totp"] });
  }

  async function recordOutcome(ctx: Context) {
    const path = ctx.path;
    if (!path?.startsWith("/two-factor/")) return;
    const failed = isAPIError(returnedValue(ctx));
    const hadSession = Boolean(ctx.context.session?.session);
    if (VERIFY_PATHS.has(path)) {
      const method = path === "/two-factor/verify-totp" ? "totp" : "recovery_code";
      if (!hadSession) {
        const userId = ctx.context.newSession?.user.id ?? await challengeUserId(ctx);
        if (userId) await emit(ctx, { userId, action: failed ? "mfa.challenge_failed" : "mfa.challenge_passed", metadata: { method } });
        return;
      }
      const activated = !failed && method === "totp" && ctx.context.newSession;
      if (activated && ctx.context.newSession) {
        const { user, session } = ctx.context.newSession;
        // Sessions established before enrollment were single-factor.
        await db.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.token, session.token)));
        await emit(ctx, { userId: user.id, action: "mfa.enabled" });
      }
      return;
    }
    const userId = ctx.context.newSession?.user.id ?? ctx.context.session?.user.id;
    if (failed || !userId) return;
    if (path === "/two-factor/enable") await emit(ctx, { userId, action: "mfa.enrollment_started" });
    if (path === "/two-factor/disable") await emit(ctx, { userId, action: "mfa.disabled" });
    if (path === "/two-factor/generate-backup-codes") await emit(ctx, { userId, action: "mfa.recovery_codes_regenerated" });
  }

  const after = async (ctx: Context) => {
    await recordOutcome(ctx);
    return gateNewSession(ctx);
  };

  return { before, after };
}

// After hooks see the endpoint result on the context; the generic type omits it.
function returnedValue(ctx: Context): unknown {
  return (ctx.context as { returned?: unknown }).returned;
}

function redirectLocation(returned: unknown): string | null {
  if (returned instanceof Response) {
    return returned.status >= 300 && returned.status < 400 ? returned.headers.get("location") : null;
  }
  if (isAPIError(returned) && returned.statusCode >= 300 && returned.statusCode < 400) {
    return new Headers(returned.headers as HeadersInit | undefined).get("location");
  }
  return null;
}
