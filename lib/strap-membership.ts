import * as tables from "@/db/schema/application";
import { rowScope } from "@/lib/authz/policies";
import type { DatabaseContext } from "@/lib/db/context";
import { maybeOne, query } from "@/lib/db/query";
import type { StrapRole, StrapType } from "@/lib/strap-permissions";
import { and, eq } from "drizzle-orm";
import "server-only";

// Membership + Strap-listing helpers.
//
// These read the creeds / creed_members tables added in the Company Batch A
// migration. They are the source of truth for "which Creeds does this user
// belong to" and "what is their role". Everything is keyed by creed_id;
// personal Creeds are just the degenerate one-member case.
//
// Reads go through whatever client the caller passes (the user's session client
// under RLS, or the service-role admin client). The generated Database types do
// not yet know these tables, so we use the DatabaseContext cast the rest of
// the backend uses.

export type StrapSummary = {
  id: string;
  type: StrapType;
  name: string;
  role: StrapRole;
  avatarUrl?: string;
  // True for a Company Strap still in onboarding (owner has not finished setup).
  // Drives the switcher's "Set up" affordance + the app gate's resume redirect.
  needsSetup: boolean;
};

/** @deprecated Use StrapSummary. */
export type CreedSummary = StrapSummary;

type CreedRow = {
  id: string;
  type: StrapType;
  name: string;
  owner_user_id: string;
  avatar_url?: string | null;
  onboarding_stage: string | null;
};

type MemberRow = {
  creed_id: string;
  user_id: string;
  role: StrapRole;
};

export type StrapMemberships = {
  straps: StrapSummary[];
  // Same answer as getPersonalStrapId, from the same read.
  personalStrapId: string | null;
};

/**
 * Every Strap the user belongs to, in one statement, plus their own Personal
 * Strap id. Throws on database errors; listUserStraps is the forgiving form.
 */
export async function readStrapMemberships(
  client: DatabaseContext,
  userId: string
): Promise<StrapMemberships> {
  const { data, error } = (await query(client, tables.creed_members, "select", (database, scope) => database
    .select({ id: tables.creeds.id, type: tables.creeds.type, name: tables.creeds.name, owner_user_id: tables.creeds.owner_user_id, avatar_url: tables.creeds.avatar_url, onboarding_stage: tables.creeds.onboarding_stage, role: tables.creed_members.role })
    .from(tables.creed_members)
    .innerJoin(tables.creeds, eq(tables.creeds.id, tables.creed_members.creed_id))
    .where(and(scope, rowScope(client, tables.creeds, "select"), eq(tables.creed_members.user_id, userId))))) as { data: Array<CreedRow & { role: StrapRole }> | null; error: { message: string } | null };
  if (error) throw new Error(error.message);
  const rows = data ?? [];

  const straps = rows
    .map((row) => ({
      id: row.id,
      type: row.type,
      name: row.name,
      role: row.role,
      avatarUrl: row.avatar_url ?? undefined,
      needsSetup: row.type === "company" && row.onboarding_stage != null,
    }))
    .sort((a, b) => {
      // Personal first, then company Creeds alphabetically.
      if (a.type !== b.type) return a.type === "personal" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  const personal = rows.find((row) => row.type === "personal" && row.owner_user_id === userId);
  return { straps, personalStrapId: personal?.id ?? null };
}

/**
 * Every Strap a user can open, personal first then Company Straps by name.
 * Used by the switcher and the app gate. Returns [] on any error so a transient
 * DB blip degrades to "personal only" rather than throwing.
 */
export async function listUserStraps(
  client: DatabaseContext,
  userId: string
): Promise<StrapSummary[]> {
  try {
    return (await readStrapMemberships(client, userId)).straps;
  } catch {
    return [];
  }
}

/** The caller's role on a Strap, or null if they are not a member. */
export async function getStrapRole(
  client: DatabaseContext,
  userId: string,
  creedId: string
): Promise<StrapRole | null> {
  const db = client;
  const { data, error } = (await query(db, tables.creed_members, "select", (database, scope) => database.select({ role: tables.creed_members.role }).from(tables.creed_members).where(and(scope, eq(tables.creed_members.creed_id, creedId), eq(tables.creed_members.user_id, userId)))).then(maybeOne)) as { data: { role: StrapRole } | null; error: unknown };
  if (error || !data) return null;
  return data.role;
}

/** The owner's Personal Strap id, creating nothing. Null if none exists. */
export async function getPersonalStrapId(
  client: DatabaseContext,
  userId: string
): Promise<string | null> {
  const db = client;
  const { data, error } = (await query(db, tables.creeds, "select", (database, scope) => database.select({ id: tables.creeds.id }).from(tables.creeds).where(and(scope, eq(tables.creeds.owner_user_id, userId), eq(tables.creeds.type, "personal")))).then(maybeOne)) as { data: { id: string } | null; error: unknown };
  if (error || !data) return null;
  return data.id;
}

export type { CreedRow, MemberRow };

/** @deprecated Use listUserStraps. */
export const listUserCreeds = listUserStraps;
/** @deprecated Use getStrapRole. */
export const getCreedRole = getStrapRole;
/** @deprecated Use getPersonalStrapId. */
export const getPersonalCreedId = getPersonalStrapId;
