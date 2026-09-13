import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listUserStraps,
  getPersonalStrapId,
  getStrapRole,
  type StrapSummary,
} from "@/lib/strap-membership";
import type { StrapRole } from "@/lib/strap-permissions";
import { getDisplayName } from "@/lib/user-name";

// Active-Strap resolution.
//
// The app renders one Strap at a time. Which one is held in a cookie
// (ACTIVE_CREED_COOKIE) so server components and route handlers agree without a
// round-trip. The cookie is advisory: it is always validated against live
// membership, and falls back to the user's Personal Strap (or their sole
// Company Strap) when it is missing, stale, or points at a Strap they no longer
// belong to. This means a removed member silently drops back to their personal
// Strap rather than seeing an error.

export const ACTIVE_CREED_COOKIE = "creed_active";

export type ActiveStrap = {
  creedId: string;
  role: StrapRole;
  creeds: StrapSummary[];
};

/** @deprecated Use ActiveStrap. */
export type ActiveCreed = ActiveStrap;

/**
 * Resolve the active Strap for a request.
 *
 * Order: the cookie's Strap if the user still belongs to it; else their
 * Personal Strap; else their first Company Strap; else null (a brand-new user
 * with no Strap row yet, which the gate routes to onboarding). `client` is the
 * caller's session client (used to read membership under RLS).
 */
// cache()-wrapped: the app layout and AuthedProviders both resolve the active
// Strap in the same render. With a shared client+user (see getRequestAuth)
// the args match, so the membership read runs once per request. A no-op in
// route handlers.
export const resolveActiveStrap = cache(async function resolveActiveStrap(
  client: unknown,
  user: User
): Promise<ActiveCreed | null> {
  const creeds = await listUserStraps(client, user.id);
  if (creeds.length === 0) return null;

  const cookieStore = await cookies();
  const requested = cookieStore.get(ACTIVE_CREED_COOKIE)?.value ?? null;

  const chosen =
    (requested && creeds.find((c) => c.id === requested)) ||
    creeds.find((c) => c.type === "personal") ||
    creeds[0];

  return { creedId: chosen.id, role: chosen.role, creeds };
});

/**
 * The active Strap's id if it is a Company Strap the caller OWNS, else null.
 *
 * Company AI billing (credits, usage, BYOK) is owner-only, and the personal AI
 * routes reuse this to decide whether to serve company data: a null result means
 * "treat this request as personal" (Personal Strap, a non-owner member, or no
 * Strap), which preserves the exact personal behaviour for everyone else.
 */
export async function resolveOwnedCompanyStrapId(
  client: unknown,
  user: User
): Promise<string | null> {
  const active = await resolveActiveStrap(client, user);
  if (!active) return null;
  const type = active.creeds.find((c) => c.id === active.creedId)?.type;
  return type === "company" && active.role === "owner" ? active.creedId : null;
}

/**
 * The active Strap's id if it is a Company Strap the caller MANAGES (owner or
 * admin), else null. Used by the GitHub sync routes: version control is a
 * manager tool, and a null result means "treat this request as personal".
 */
export async function resolveManagedCompanyStrapId(
  client: unknown,
  user: User
): Promise<string | null> {
  const active = await resolveActiveStrap(client, user);
  if (!active) return null;
  const type = active.creeds.find((c) => c.id === active.creedId)?.type;
  return type === "company" && (active.role === "owner" || active.role === "admin")
    ? active.creedId
    : null;
}

/**
 * The active Strap if it is a Company Strap the caller belongs to (any role),
 * with that role, else null. Used by the read-only company AI routes (credits /
 * usage / settings / balance): every member may VIEW the company's model usage,
 * while mutations stay gated on {@link resolveOwnedCompanyCreedId}. The role lets
 * a read strip owner-only detail (e.g. purchase history) for plain members.
 */
export async function resolveMemberCompanyStrap(
  client: unknown,
  user: User
): Promise<{ creedId: string; role: StrapRole } | null> {
  const active = await resolveActiveStrap(client, user);
  if (!active) return null;
  const type = active.creeds.find((c) => c.id === active.creedId)?.type;
  return type === "company" ? { creedId: active.creedId, role: active.role } : null;
}

/**
 * A specific Company Strap the caller belongs to (any role), by explicit id -
 * independent of the active-Strap cookie. Company settings passes its own
 * creedId to the AI-data reads (credits / usage / settings) so the company card
 * always loads THAT company's pooled figures, never a cookie-timing fallback to
 * the caller's personal balance. Returns null if the id is not a Company Strap
 * the user is a member of. `client` reads membership under RLS.
 */
export async function resolveMemberCompanyStrapById(
  client: unknown,
  user: User,
  creedId: string
): Promise<{ creedId: string; role: StrapRole } | null> {
  const creeds = await listUserStraps(client, user.id);
  const match = creeds.find((c) => c.id === creedId && c.type === "company");
  return match ? { creedId: match.id, role: match.role } : null;
}

/**
 * Set the active-Strap cookie after validating membership. Returns the resolved
 * role, or null if the user is not a member of that Strap (caller should 403).
 * Called by POST /api/app/straps/activate.
 */
export async function setActiveStrap(
  client: unknown,
  user: User,
  creedId: string
): Promise<StrapRole | null> {
  const role = await getStrapRole(client, user.id, creedId);
  if (!role) return null;

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CREED_COOKIE, creedId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Persist across sessions; membership is re-validated on every read.
    maxAge: 60 * 60 * 24 * 365,
  });
  return role;
}

/**
 * The user's Personal Strap id, provisioning one via the admin client if it is
 * somehow missing (e.g. a user created before the backfill, or a race). Used by
 * paths that must always resolve a Personal Strap (the personal state loader).
 */
export async function ensurePersonalStrapId(
  client: unknown,
  user: User
): Promise<string> {
  const existing = await getPersonalStrapId(client, user.id);
  if (existing) return existing;

  const admin = getSupabaseAdminClient() as unknown as {
    from: (t: string) => {
      insert: (v: unknown) => {
        select: (c: string) => { single: () => Promise<{ data: { id: string } | null; error: unknown }> };
      };
    };
  };
  const name = getDisplayName(user, "Your Strap");

  const { data, error } = await admin
    .from("creeds")
    .insert({ type: "personal", name, owner_user_id: user.id })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error("Could not provision a personal Strap.");
  }

  // Owner membership row (best-effort; the unique index makes a retry safe).
  const adminMembers = getSupabaseAdminClient() as unknown as {
    from: (t: string) => { insert: (v: unknown) => Promise<{ error: unknown }> };
  };
  await adminMembers.from("creed_members").insert({
    creed_id: data.id,
    user_id: user.id,
    role: "owner",
  });

  return data.id;
}

export const ACTIVE_STRAP_COOKIE = ACTIVE_CREED_COOKIE;
/** @deprecated Use resolveActiveStrap. */
export const resolveActiveCreed = resolveActiveStrap;
/** @deprecated Use resolveOwnedCompanyStrapId. */
export const resolveOwnedCompanyCreedId = resolveOwnedCompanyStrapId;
/** @deprecated Use resolveManagedCompanyStrapId. */
export const resolveManagedCompanyCreedId = resolveManagedCompanyStrapId;
/** @deprecated Use resolveMemberCompanyStrap. */
export const resolveMemberCompanyCreed = resolveMemberCompanyStrap;
/** @deprecated Use resolveMemberCompanyStrapById. */
export const resolveMemberCompanyCreedById = resolveMemberCompanyStrapById;
/** @deprecated Use setActiveStrap. */
export const setActiveCreed = setActiveStrap;
/** @deprecated Use ensurePersonalStrapId. */
export const ensurePersonalCreedId = ensurePersonalStrapId;
