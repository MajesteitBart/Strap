import * as tables from "@/db/schema/application";
import { requireApiAuth } from "@/lib/api-auth";
import { setSectionPermission } from "@/lib/company-admin";
import { query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import { readStrapId } from "@/lib/strap-api";
import { normalizeAgentPermission } from "@/lib/strap-data";
import { getCreedRole } from "@/lib/strap-membership";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET /api/app/company/permissions?creedId=&userId= - a member's per-section
// permission overrides (owner/admin only), for the Permissions editor.
export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const url = new URL(request.url);
  const creedId =
    url.searchParams.get("strapId") ?? url.searchParams.get("creedId");
  const userId = url.searchParams.get("userId");
  if (!creedId || !userId) {
    return NextResponse.json({ error: "strapId and userId are required." }, { status: 400 });
  }
  const role = await getCreedRole(auth.context, auth.user.id, creedId);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const admin = serviceContext("app/api/app/company/permissions/route.ts");
  const { data } = (await query(admin, tables.creed_member_section_permissions, "select", (database, scope) => database.select({ section_id: tables.creed_member_section_permissions.section_id, permission: tables.creed_member_section_permissions.permission }).from(tables.creed_member_section_permissions).where(and(scope, eq(tables.creed_member_section_permissions.creed_id, creedId), eq(tables.creed_member_section_permissions.user_id, userId))))) as { data: Array<{ section_id: string; permission: string }> | null };
  const overrides: Record<string, string> = {};
  for (const row of data ?? []) overrides[row.section_id] = row.permission;
  return NextResponse.json({ overrides });
}

// POST /api/app/company/permissions { creedId, userId, sectionId, permission }
// Owner/admin sets a member's per-section permission.
export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const b = (await request.json().catch(() => ({}))) as {
    strapId?: unknown;
    creedId?: unknown;
    userId?: unknown;
    sectionId?: unknown;
    permission?: unknown;
  };
  const strapId = readStrapId(b);
  if (
    !strapId ||
    typeof b.userId !== "string" ||
    typeof b.sectionId !== "string" ||
    typeof b.permission !== "string"
  ) {
    return NextResponse.json({ error: "strapId, userId, sectionId, permission are required." }, { status: 400 });
  }
  const result = await setSectionPermission({
    creedId: strapId,
    actor: auth.user,
    targetUserId: b.userId,
    sectionId: b.sectionId,
    permission: normalizeAgentPermission(b.permission),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
