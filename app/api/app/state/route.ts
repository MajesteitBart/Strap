import * as tables from "@/db/schema/application";
import { requireApiAuth } from "@/lib/api-auth";
import { maybeOne, query } from "@/lib/db/query";
import { log } from "@/lib/observability";
import { loadActiveStrapState, persistStrapState } from "@/lib/strap-backend";
import { resolveActiveStrap } from "@/lib/strap-context";
import { validateStrapState } from "@/lib/validation/strap-state";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const active = await resolveActiveStrap(auth.context, auth.user);
  const [result, gettingStartedResult] = await Promise.all([
    loadActiveStrapState(auth.context, auth.user, active),
    // The "Get started" checklist rides along on every state GET (PK read,
    // sub-ms) so the client never needs a separate fetch or poll for it.
    query(auth.context, tables.creed_getting_started, "select", (database, scope) => database.select({ steps: tables.creed_getting_started.steps, completed_at: tables.creed_getting_started.completed_at }).from(tables.creed_getting_started).where(and(scope, eq(tables.creed_getting_started.user_id, auth.user.id)))).then(maybeOne),
  ]);
  const row = gettingStartedResult.error
    ? null
    : (gettingStartedResult.data as {
        steps: Record<string, boolean>;
        completed_at: string | null;
      } | null);
  result.state.gettingStarted = row
    ? { steps: row.steps ?? {}, completedAt: row.completed_at }
    : null;
  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  // The full-state PUT is the personal autosave path (writes by user_id). In
  // company mode the client must use the per-section API instead; reject here so
  // a stray company-mode PUT can never write company sections onto the personal
  // Strap.
  const active = await resolveActiveStrap(auth.context, auth.user);
  if (active) {
    const activeEntry = active.creeds.find((c) => c.id === active.creedId);
    if (activeEntry?.type === "company") {
      return NextResponse.json(
        { error: "Company Straps save per section.", code: "companyMode" },
        { status: 409 },
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const candidate =
    body && typeof body === "object" && "state" in body
      ? (body as { state: unknown }).state
      : null;

  const parsed = validateStrapState(candidate);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await persistStrapState(auth.context, auth.user.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error(
      "personal_creed_state_save_failed",
      { userId: auth.user.id },
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Could not save Strap." },
      { status: 500 },
    );
  }
}
