import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getCreedRole } from "@/lib/creed-membership";
import {
  createHeadlessAccessKey,
  listHeadlessKeys,
} from "@/lib/headless-access";
import { isHeadlessKeyMode, parseOptionalExpiry } from "@/lib/headless-access-shared";
import { recordAuditEvent } from "@/lib/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const creedId = new URL(request.url).searchParams.get("creedId")?.trim();
  if (!creedId) {
    return NextResponse.json({ error: "creedId is required." }, { status: 400 });
  }
  if (!(await getCreedRole(auth.supabase, auth.user.id, creedId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const keys = await listHeadlessKeys(auth.user.id, creedId);
  return NextResponse.json({ keys }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const creedId = typeof body.creedId === "string" ? body.creedId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const expiresAt = parseOptionalExpiry(body.expiresAt ?? null);
  if (!creedId || !name || name.length > 120 || !isHeadlessKeyMode(body.mode) || expiresAt === undefined) {
    return NextResponse.json(
      { error: "Valid creedId, name, mode, and optional future expiresAt are required." },
      { status: 400 },
    );
  }
  if (!(await getCreedRole(auth.supabase, auth.user.id, creedId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const created = await createHeadlessAccessKey({
    userId: auth.user.id,
    creedId,
    name,
    mode: body.mode,
    expiresAt,
  });
  void recordAuditEvent({
    userId: auth.user.id,
    action: "headless.key_created",
    metadata: { keyId: created.metadata.id, creedId, mode: created.metadata.mode },
    request,
  });
  return NextResponse.json(created, { status: 201, headers: NO_STORE });
}
