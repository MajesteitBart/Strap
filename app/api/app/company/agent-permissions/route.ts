import * as tables from "@/db/schema/application";
import { requireApiAuth } from "@/lib/api-auth";
import { authorizeValues } from "@/lib/authz/policies";
import type { DatabaseContext } from "@/lib/db/context";
import { conflictSet, query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import { readStrapId } from "@/lib/strap-api";
import { getCreedRole } from "@/lib/strap-membership";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

// A member's OWN per-section agent ceiling on a Company Strap (the company twin
// of the personal creed_sections.agent_permission). Strictly self-serve: every
// member manages only their own rows, so there is no role gate beyond
// membership. 'hidden' takes effect immediately (the section is stripped from
// that member's MCP payload); the write levels become live ceilings when
// company MCP writes ship.

const LEVELS = new Set(["hidden", "read-only", "propose", "direct"]);

function admin(): DatabaseContext {
  return serviceContext("app/api/app/company/agent-permissions/route.ts");
}

// POST { creedId, sectionId, permission } - set one section's level for the
// calling member. POST { creedId, permission, allSections: true } - set every
// visible section at once (the personal "All sections" control).
export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as {
    strapId?: unknown;
    creedId?: unknown;
    sectionId?: unknown;
    permission?: unknown;
    allSections?: unknown;
  };
  const strapId = readStrapId(b);
  if (!strapId || typeof b.permission !== "string" || !LEVELS.has(b.permission)) {
    return NextResponse.json({ error: "strapId and a valid permission are required." }, { status: 400 });
  }
  const allSections = b.allSections === true;
  if (!allSections && typeof b.sectionId !== "string") {
    return NextResponse.json({ error: "sectionId is required." }, { status: 400 });
  }

  const role = await getCreedRole(auth.context, auth.user.id, strapId);
  if (!role) {
    return NextResponse.json({ error: "You are not a member of this Strap." }, { status: 403 });
  }

  const db = admin();
  const now = new Date().toISOString();

  if (allSections) {
    const { data } = (await query(db, tables.creed_sections, "select", (database, scope) => database.select({ section_id: tables.creed_sections.section_id }).from(tables.creed_sections).where(and(scope, eq(tables.creed_sections.creed_id, strapId), isNull(tables.creed_sections.deleted_at))))) as { data: Array<{ section_id: string }> | null };
    const rows = (data ?? []).map((row) => ({
      creed_id: strapId,
      user_id: auth.user.id,
      section_id: row.section_id,
      permission: b.permission,
      updated_at: now,
    }));
    if (rows.length > 0) {
      const { error } = await query(db, tables.creed_member_agent_permissions, "insert", async (database, scope) => {
    const values = rows as typeof tables.creed_member_agent_permissions.$inferInsert[];
    await authorizeValues(db, tables.creed_member_agent_permissions, "insert", values);
    return database.insert(tables.creed_member_agent_permissions).values(values).onConflictDoUpdate({ target: [tables.creed_member_agent_permissions.creed_id, tables.creed_member_agent_permissions.user_id, tables.creed_member_agent_permissions.section_id], set: conflictSet(tables.creed_member_agent_permissions, values), setWhere: scope });
  });
      if (error) {
        return NextResponse.json({ error: "Could not update agent permissions." }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true });
  }

  const { error } = await query(db, tables.creed_member_agent_permissions, "insert", async (database, scope) => {
    const values = {
      creed_id: strapId,
      user_id: auth.user.id,
      section_id: b.sectionId,
      permission: b.permission,
      updated_at: now,
    } as typeof tables.creed_member_agent_permissions.$inferInsert;
    await authorizeValues(db, tables.creed_member_agent_permissions, "insert", values);
    return database.insert(tables.creed_member_agent_permissions).values(values).onConflictDoUpdate({ target: [tables.creed_member_agent_permissions.creed_id, tables.creed_member_agent_permissions.user_id, tables.creed_member_agent_permissions.section_id], set: conflictSet(tables.creed_member_agent_permissions, values), setWhere: scope });
  });
  if (error) {
    return NextResponse.json({ error: "Could not update the agent permission." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
