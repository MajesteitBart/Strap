import { getAuthServer } from "@/lib/auth/server";
export async function POST(request: Request) {
  const url = new URL("/api/auth/sign-out", request.url);
  const signedOut = await getAuthServer().handler(new Request(url, { method: "POST", headers: request.headers }));
  if (!signedOut.ok) return signedOut;
  const response = Response.json({ ok: true, redirectTo: new URL("/", request.url).href }, { headers: { "Cache-Control": "private, no-store" } });
  for (const cookie of signedOut.headers.getSetCookie()) response.headers.append("Set-Cookie", cookie);
  return response;
}
