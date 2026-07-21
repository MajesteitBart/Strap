import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { deleteCompany } from "@/lib/company-admin";
import { provisionCompany } from "@/lib/company-provision";
import { setActiveCreed } from "@/lib/creed-context";
import { recordAuditEvent } from "@/lib/audit-log";

// POST /api/app/company - create (or resume) the caller's company Creed and
// make it active. Idempotent per owner: one owned company per user, so a
// retry returns the existing shell. Onboarding continues in the app.
export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const creedId = await provisionCompany(auth.user.id);
    await setActiveCreed(auth.supabase, auth.user, creedId);
    await recordAuditEvent({
      userId: auth.user.id,
      action: "company.provisioned",
      metadata: { creedId },
      request,
    });
    return NextResponse.json({ ok: true, creedId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create the company Creed." },
      { status: 500 }
    );
  }
}

// DELETE /api/app/company { creedId } - delete the company Creed (owner-only).
export async function DELETE(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const b = (await request.json().catch(() => ({}))) as { creedId?: unknown };
  if (typeof b.creedId !== "string") {
    return NextResponse.json({ error: "creedId is required." }, { status: 400 });
  }
  const result = await deleteCompany({ creedId: b.creedId, actor: auth.user });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
