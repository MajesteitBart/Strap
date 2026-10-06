import { digestCredential } from "@/lib/headless-access-shared";
import { verifyDeviceUserCode } from "@/lib/oauth-device";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestAuth } from "@/lib/request-auth";
import { redirectResponse } from "@/lib/http/responses";

export async function POST(request: Request) {
  const { data: { user } } = await getRequestAuth().then(({ user }) => ({ data: { user } }));
  if (!user) {
    return redirectResponse(new URL("/login?next=/device", request.url), 303);
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
    return redirectResponse(new URL("/device?error=rate", request.url), 303);
  }
  const form = await request.formData();
  const code = String(form.get("user_code") ?? "").slice(0, 32);
  const requestId = await verifyDeviceUserCode(code);
  if (!requestId) {
    return redirectResponse(new URL("/device?error=invalid", request.url), 303);
  }
  return redirectResponse(new URL(`/device?request=${encodeURIComponent(requestId)}`, request.url), 303);
}
