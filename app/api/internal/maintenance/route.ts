import { authorizeMaintenance } from "@/lib/authz/maintenance";
import { getDatabase } from "@/lib/db/client";
import { pruneActivity, pruneExpiredAuthorizations } from "@/lib/db/repositories/maintenance";
import { log } from "@/lib/observability";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!authorizeMaintenance(request.headers.get("authorization"), process.env.STRAP_MAINTENANCE_SECRET)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const deleted = await pruneActivity(getDatabase());
  const expired = await pruneExpiredAuthorizations(getDatabase());
  log.info("maintenance_completed", { deleted, ...expired });
  return NextResponse.json({ ok: true, deleted, expired }, { headers: { "Cache-Control": "no-store" } });
}
