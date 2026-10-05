import { isDatabaseConfigured } from "@/lib/env";
import { currentRequestCookie } from "@/lib/http/request-context";
import { log } from "@/lib/observability";
import { getRequestAuth } from "@/lib/request-auth";
import { sanitizeNextPath } from "@/lib/safe-next";
import { isDatabaseTableMissingError } from "@/lib/strap-backend-errors";
import { readStrapMemberships } from "@/lib/strap-membership";
import "server-only";

// Server-side decisions for the public entry points: `/` and the sign-in pages.

type Redirect = { kind: "redirect"; to: string };

const SESSION_COOKIES = ["better-auth.session_token", "__Secure-better-auth.session_token"];

// `/` sends signed-out visitors to /home, onboarded users to /file and
// everyone else to onboarding.
export async function resolveRootEntry(): Promise<Redirect | { kind: "missing-schema"; message: string }> {
  if (!isDatabaseConfigured()) return { kind: "redirect", to: "/home" };

  // Fast path for signed-out visitors (and every crawler that hits `/`): no
  // session cookie means authentication and its database round-trips can be
  // skipped. Anyone holding a cookie, even an expired one, gets the real
  // session check below.
  if (!SESSION_COOKIES.some((name) => currentRequestCookie(name) !== undefined)) {
    return { kind: "redirect", to: "/home" };
  }

  let auth;
  try {
    auth = await getRequestAuth();
  } catch (error) {
    log.error("home_get_user_failed", { route: "/" }, error);
    throw error;
  }
  const { context, user } = auth;
  if (!user) return { kind: "redirect", to: "/home" };

  let memberships;
  try {
    memberships = await readStrapMemberships(context, user.id);
  } catch (error) {
    if (isDatabaseTableMissingError(error)) {
      return { kind: "missing-schema", message: error instanceof Error ? error.message : "Strap tables are missing." };
    }
    log.error("home_has_persisted_creed_failed", { route: "/", userId: user.id }, error);
    throw error;
  }

  // A company member goes straight into the app; the app gate resolves their
  // active (company) Strap and, for an owner who hasn't finished company setup,
  // resumes company onboarding. They must never be routed through the personal
  // first-run flow.
  if (memberships.straps.some((strap) => strap.type === "company")) return { kind: "redirect", to: "/file" };
  return { kind: "redirect", to: memberships.personalStrapId ? "/file" : "/onboarding" };
}

// Sign-in, sign-up and two-factor pages: a signed-in visitor goes on to `next`
// (or the app) instead of seeing the form again.
export async function resolveSignInEntry(next: unknown, { requireConfigured }: { requireConfigured: boolean }): Promise<
  Redirect | { kind: "ready"; configured: boolean; nextPath: string }
> {
  const nextPath = sanitizeNextPath(typeof next === "string" ? next : undefined);
  const configured = isDatabaseConfigured();
  if (!configured) {
    return requireConfigured ? { kind: "redirect", to: "/login" } : { kind: "ready", configured, nextPath };
  }
  const { user } = await getRequestAuth();
  if (user) return { kind: "redirect", to: nextPath };
  return { kind: "ready", configured, nextPath };
}
