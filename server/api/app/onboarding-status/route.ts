import { requireApiAuth } from "@/lib/api-auth";
import { NO_STORE_HEADERS } from "@/lib/http-headers";
import { hasPersistedCreed } from "@/lib/strap-backend";

// A label hint for marketing CTAs. The client treats an unauthenticated
// response as "Get started"; every app API still enforces session auth.

export async function GET() {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;
  try {
    const started = await hasPersistedCreed(auth.context, auth.user.id);
    return Response.json({ started }, { headers: NO_STORE_HEADERS });
  } catch {
    return Response.json({ started: false }, { headers: NO_STORE_HEADERS });
  }
}
