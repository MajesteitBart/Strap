import { getAuthServer } from "@/lib/auth/server";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const url = new URL("/api/auth/sign-out", request.url);
  const signedOut = await getAuthServer().handler(new Request(url, { method: "POST", headers: request.headers }));
  if (!signedOut.ok) return signedOut;
  const response = NextResponse.json({ ok: true, redirectTo: new URL("/", request.url).href }, { headers: { "Cache-Control": "private, no-store" } });
  for (const cookie of signedOut.headers.getSetCookie()) response.headers.append("Set-Cookie", cookie);
  return response;
}
