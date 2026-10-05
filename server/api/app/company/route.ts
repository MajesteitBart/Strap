import { requireApiAuth } from "@/lib/api-auth";
import { recordAuditEvent } from "@/lib/audit-log";
import { deleteCompany } from "@/lib/company-admin";
import { provisionCompany } from "@/lib/company-provision";
import { readStrapId } from "@/lib/strap-api";
import { setActiveCreed } from "@/lib/strap-context";

// POST /api/app/company - create (or resume) the caller's Company Strap and
// make it active. Idempotent per owner: one owned company per user, so a
// retry returns the existing shell. Onboarding continues in the app.
export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;

  try {
    const creedId = await provisionCompany(auth.user.id);
    await setActiveCreed(auth.context, auth.user, creedId);
    await recordAuditEvent({
      userId: auth.user.id,
      action: "company.provisioned",
      metadata: { creedId },
      request,
    });
    return Response.json({ ok: true, strapId: creedId, creedId });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not create the company Strap." },
      { status: 500 }
    );
  }
}

// DELETE /api/app/company { creedId } - delete the Company Strap (owner-only).
export async function DELETE(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;
  const b = (await request.json().catch(() => ({}))) as {
    strapId?: unknown;
    creedId?: unknown;
  };
  const strapId = readStrapId(b);
  if (!strapId) {
    return Response.json({ error: "strapId is required." }, { status: 400 });
  }
  const result = await deleteCompany({ creedId: strapId, actor: auth.user });
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ ok: true });
}
