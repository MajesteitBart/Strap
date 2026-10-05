import { requireApiAuth } from "@/lib/api-auth";
import { log } from "@/lib/observability";
import { loadActiveStrapState, persistStrapState } from "@/lib/strap-backend";
import { resolveActiveStrap } from "@/lib/strap-context";
import { validateStrapState } from "@/lib/validation/strap-state";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;

  const active = await resolveActiveStrap(auth.context, auth.user);
  // The state includes the "Get started" checklist, so the client never needs
  // a separate fetch or poll for it.
  const result = await loadActiveStrapState(auth.context, auth.user, active);
  return Response.json(result);
}

export async function PUT(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;

  // The full-state PUT is the personal autosave path (writes by user_id). In
  // company mode the client must use the per-section API instead; reject here so
  // a stray company-mode PUT can never write company sections onto the personal
  // Strap.
  const active = await resolveActiveStrap(auth.context, auth.user);
  if (active) {
    const activeEntry = active.creeds.find((c) => c.id === active.creedId);
    if (activeEntry?.type === "company") {
      return Response.json(
        { error: "Company Straps save per section.", code: "companyMode" },
        { status: 409 },
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const candidate =
    body && typeof body === "object" && "state" in body
      ? (body as { state: unknown }).state
      : null;

  const parsed = validateStrapState(candidate);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await persistStrapState(auth.context, auth.user.id, parsed.data);
    return Response.json({ ok: true });
  } catch (error) {
    log.error(
      "personal_creed_state_save_failed",
      { userId: auth.user.id },
      error instanceof Error ? error : new Error(String(error)),
    );
    return Response.json(
      { error: "Could not save Strap." },
      { status: 500 },
    );
  }
}
