import { requireApiAuth } from "@/lib/api-auth";
import { NO_STORE_HEADERS } from "@/lib/http-headers";
import { hasPersistedCreed } from "@/lib/strap-backend";
import { NextResponse } from "next/server";

// A label hint for marketing CTAs. The client treats an unauthenticated
// response as "Get started"; every app API still enforces session auth.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  try {
    const started = await hasPersistedCreed(auth.context, auth.user.id);
    return NextResponse.json({ started }, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json({ started: false }, { headers: NO_STORE_HEADERS });
  }
}
