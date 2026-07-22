import "server-only";
import type { SupabaseLikeClient } from "@/lib/supabase/types";
import type { CreedRole, CreedType } from "@/lib/creed-permissions";

// Membership + Creed-listing helpers.
//
// These read the creeds / creed_members tables added in the Company Batch A
// migration. They are the source of truth for "which Creeds does this user
// belong to" and "what is their role". Everything is keyed by creed_id;
// personal Creeds are just the degenerate one-member case.
//
// Reads go through whatever client the caller passes (the user's session client
// under RLS, or the service-role admin client). The generated Database types do
// not yet know these tables, so we use the SupabaseLikeClient cast the rest of
// the backend uses.

export type CreedSummary = {
  id: string;
  type: CreedType;
  name: string;
  role: CreedRole;
  avatarUrl?: string;
  // True for a company Creed still in onboarding (owner has not finished setup).
  // Drives the switcher's "Set up" affordance + the app gate's resume redirect.
  needsSetup: boolean;
};

type CreedRow = {
  id: string;
  type: CreedType;
  name: string;
  owner_user_id: string;
  avatar_url?: string | null;
  onboarding_stage: string | null;
};

type MemberRow = {
  creed_id: string;
  user_id: string;
  role: CreedRole;
};

/**
 * Every Creed a user can open, personal first then company Creeds by name.
 * Used by the switcher and the app gate. Returns [] on any error so a transient
 * DB blip degrades to "personal only" rather than throwing.
 */
export async function listUserCreeds(
  client: unknown,
  userId: string
): Promise<CreedSummary[]> {
  const db = client as SupabaseLikeClient;
  const { data: memberRows, error: memberError } = (await db
    .from("creed_members")
    .select("creed_id, role")
    .eq("user_id", userId)) as { data: Array<{ creed_id: string; role: CreedRole }> | null; error: unknown };

  if (memberError || !memberRows || memberRows.length === 0) {
    return [];
  }

  const roleByCreed = new Map(memberRows.map((row) => [row.creed_id, row.role]));
  const ids = [...roleByCreed.keys()];

  let creedRows: CreedRow[] | null = null;
  const withAvatar = (await db
    .from("creeds")
    .select("id, type, name, owner_user_id, avatar_url, onboarding_stage")
    .in("id", ids)) as { data: CreedRow[] | null; error: unknown };

  if (withAvatar.error) {
    const fallback = (await db
      .from("creeds")
      .select("id, type, name, owner_user_id, onboarding_stage")
      .in("id", ids)) as { data: CreedRow[] | null; error: unknown };
    if (fallback.error || !fallback.data) {
      return [];
    }
    creedRows = fallback.data;
  } else {
    creedRows = withAvatar.data;
  }

  if (!creedRows) {
    return [];
  }

  const mapped = creedRows
    .map((row) => ({
      id: row.id,
      type: row.type,
      name: row.name,
      role: roleByCreed.get(row.id) ?? "member",
      avatarUrl: row.avatar_url ?? undefined,
      needsSetup: row.type === "company" && row.onboarding_stage != null,
    }))
    .sort((a, b) => {
      // Personal first, then company Creeds alphabetically.
      if (a.type !== b.type) return a.type === "personal" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return mapped;
}

/** The caller's role on a Creed, or null if they are not a member. */
export async function getCreedRole(
  client: unknown,
  userId: string,
  creedId: string
): Promise<CreedRole | null> {
  const db = client as SupabaseLikeClient;
  const { data, error } = (await db
    .from("creed_members")
    .select("role")
    .eq("creed_id", creedId)
    .eq("user_id", userId)
    .maybeSingle()) as { data: { role: CreedRole } | null; error: unknown };
  if (error || !data) return null;
  return data.role;
}

/** The owner's personal Creed id, creating nothing. Null if none exists. */
export async function getPersonalCreedId(
  client: unknown,
  userId: string
): Promise<string | null> {
  const db = client as SupabaseLikeClient;
  const { data, error } = (await db
    .from("creeds")
    .select("id")
    .eq("owner_user_id", userId)
    .eq("type", "personal")
    .maybeSingle()) as { data: { id: string } | null; error: unknown };
  if (error || !data) return null;
  return data.id;
}

/**
 * Does the user hold membership on at least one company Creed? Used by the app
 * gate so an invited member without a personal Creed of their own still enters.
 * Reads membership under RLS via the passed client.
 */
export async function hasCompanyMembership(
  client: unknown,
  userId: string
): Promise<boolean> {
  const db = client as SupabaseLikeClient;
  const { data: memberRows, error: memberError } = (await db
    .from("creed_members")
    .select("creed_id")
    .eq("user_id", userId)) as { data: Array<{ creed_id: string }> | null; error: unknown };
  if (memberError || !memberRows?.length) return false;

  const { data: companyRows, error: companyError } = (await db
    .from("creeds")
    .select("id")
    .in("id", memberRows.map((row) => row.creed_id))
    .eq("type", "company")
    .limit(1)) as { data: Array<{ id: string }> | null; error: unknown };

  return !companyError && Boolean(companyRows?.length);
}

export type { MemberRow, CreedRow };
