import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { digestCredential } from "@/lib/headless-access-shared";
import { verifyDeviceUserCode } from "@/lib/oauth-device";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/device", request.url), 303);
  }
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const identifier = digestCredential(forwarded || request.headers.get("x-real-ip") || "unknown");
  const verdict = checkRateLimit({
    scope: "oauth-device-verify",
    identifier,
    limit: 10,
    windowMs: 60_000,
  });
  if (!verdict.ok) {
    return NextResponse.redirect(new URL("/device?error=rate", request.url), 303);
  }
  const form = await request.formData();
  const code = String(form.get("user_code") ?? "").slice(0, 32);
  const requestId = await verifyDeviceUserCode(code);
  if (!requestId) {
    return NextResponse.redirect(new URL("/device?error=invalid", request.url), 303);
  }
  return NextResponse.redirect(new URL(`/device?request=${encodeURIComponent(requestId)}`, request.url), 303);
}
