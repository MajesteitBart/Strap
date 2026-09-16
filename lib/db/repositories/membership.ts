// Local migration probe: explicit viewer scope replaces session-client RLS.
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { creed_members, creeds } from "../../../db/schema/application.ts";
import { AccessDeniedError, type Viewer } from "../../authz/viewer.ts";
import type { StrapRole, StrapType } from "../../strap-permissions.ts";

function role(value: string): StrapRole {
  if (value === "owner" || value === "admin" || value === "member") return value;
  throw new AccessDeniedError();
}
function type(value: string): StrapType {
  if (value === "personal" || value === "company") return value;
  throw new AccessDeniedError();
}

export async function listMemberships(db: PostgresJsDatabase, viewer: Viewer) {
  const rows = await db.select({
    id: creeds.id, type: creeds.type, name: creeds.name,
    role: creed_members.role, avatarUrl: creeds.avatar_url, stage: creeds.onboarding_stage,
  }).from(creed_members).innerJoin(creeds, eq(creeds.id, creed_members.creed_id))
    .where(eq(creed_members.user_id, viewer.userId));
  return rows.map((row) => ({
    id: row.id, type: type(row.type), name: row.name, role: role(row.role),
    avatarUrl: row.avatarUrl ?? undefined, needsSetup: row.type === "company" && row.stage !== null,
  })).sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === "personal" ? -1 : 1);
}

export async function findMembership(db: PostgresJsDatabase, viewer: Viewer, profileId: string) {
  const [row] = await db.select({ role: creed_members.role }).from(creed_members)
    .where(and(eq(creed_members.creed_id, profileId), eq(creed_members.user_id, viewer.userId))).limit(1);
  return row ? role(row.role) : null;
}

export async function requireMembership(db: PostgresJsDatabase, viewer: Viewer, profileId: string) {
  const membership = await findMembership(db, viewer, profileId);
  if (!membership) throw new AccessDeniedError();
  return membership;
}

export async function findPersonalProfile(db: PostgresJsDatabase, viewer: Viewer) {
  const [row] = await db.select({ id: creeds.id }).from(creeds)
    .where(and(eq(creeds.owner_user_id, viewer.userId), eq(creeds.type, "personal"))).limit(1);
  return row?.id ?? null;
}
