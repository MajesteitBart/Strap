import { serviceContext } from "@/lib/db/service";
import { isDatabaseConfigured } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildAgentPayloadForToken } from "@/lib/strap-backend";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return new Response("Database configuration is missing.", { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get("authorization");
  // Bearer-only. The legacy `?token=` query-string fallback was removed
  // because URL params leak into Referer headers, server access logs, and
  // browser history. Agents that hit this endpoint must send the token in
  // the Authorization header.
  const token =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const integration = searchParams.get("integration");

  if (!token) {
    return new Response(
      "Missing bearer token. Send the Strap token in an `Authorization: Bearer <token>` header.",
      { status: 401 }
    );
  }

  const verdict = checkRateLimit({
    scope: "creed-read",
    identifier: token,
    limit: 120,
    windowMs: 60_000,
  });
  if (!verdict.ok) {
    return new Response("Too many requests.", {
      status: 429,
      headers: { "Retry-After": String(verdict.retryAfterSeconds) },
    });
  }

  const admin = serviceContext("server/api/creed/route.ts");
  const result = await buildAgentPayloadForToken(admin as never, token, integration);

  if (!result) {
    return new Response("Invalid token.", { status: 401 });
  }

  return new Response(result.payload, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
