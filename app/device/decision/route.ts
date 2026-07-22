import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decideDeviceAuthorization } from "@/lib/oauth-device";
import { isHeadlessKeyMode } from "@/lib/headless-access-shared";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/device", request.url), 303);
  const form = await request.formData();
  const requestId = String(form.get("request_id") ?? "");
  const decision = form.get("decision") === "allow" ? "allow" : "deny";
  const creedId = decision === "allow" ? String(form.get("creed_id") ?? "") : null;
  const rawMode = form.get("mode");
  const mode = isHeadlessKeyMode(rawMode) ? rawMode : "proposal-only";
  if (!requestId || requestId.length > 64) {
    return NextResponse.redirect(new URL("/device?error=invalid", request.url), 303);
  }
  const ok = await decideDeviceAuthorization({ requestId, userId: user.id, creedId, mode, decision, request });
  return NextResponse.redirect(new URL(ok ? `/device?result=${decision === "allow" ? "approved" : "denied"}` : "/device?error=invalid", request.url), 303);
}
