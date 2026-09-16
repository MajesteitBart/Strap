import { requireApiAuth } from "@/lib/api-auth";
import { serviceContext } from "@/lib/db/service";
import { isMcpHealthRange, loadMcpHealth } from "@/lib/mcp-health";
import { resolveActiveCreed } from "@/lib/strap-context";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const rangeParam = new URL(request.url).searchParams.get("range") ?? "30d";
  const range = isMcpHealthRange(rangeParam) ? rangeParam : "30d";

  // Scope the dashboard to the active Strap. A Company Strap reads its own
  // telemetry (creed_id-scoped) through the admin client after resolveActiveCreed
  // has confirmed membership; Personal Straps keep the original user-scoped read
  // on the session client, so personal behaviour is unchanged.
  const active = await resolveActiveCreed(auth.context, auth.user);
  const activeType = active?.creeds.find((c) => c.id === active.creedId)?.type;

  const health =
    active && activeType === "company"
      ? await loadMcpHealth(serviceContext("app/api/app/mcp/health/route.ts"), { kind: "creed", creedId: active.creedId }, range)
      : await loadMcpHealth(auth.context, { kind: "user", userId: auth.user.id }, range);

  return NextResponse.json({ health });
}
