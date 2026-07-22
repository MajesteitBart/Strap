import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { digestCredential } from "@/lib/headless-access-shared";
import { createDeviceAuthorization } from "@/lib/oauth-device";
import { getOAuthClient } from "@/lib/oauth";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: HEADERS });
}

async function readParams(request: Request): Promise<Record<string, string>> {
  if ((request.headers.get("content-type") ?? "").includes("application/json")) {
    const input = (await request.json()) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(input).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  }
  const form = await request.formData();
  const output: Record<string, string> = {};
  for (const [key, value] of form.entries()) if (typeof value === "string") output[key] = value;
  return output;
}

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "server_error" }, { status: 503, headers: HEADERS });
  }
  let params: Record<string, string>;
  try {
    params = await readParams(request);
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: HEADERS });
  }
  const clientId = params.client_id?.trim();
  if (!clientId || !(await getOAuthClient(clientId))) {
    return NextResponse.json({ error: "invalid_client" }, { status: 400, headers: HEADERS });
  }
  const verdict = checkRateLimit({
    scope: "oauth-device-authorize",
    identifier: digestCredential(clientId),
    limit: 20,
    windowMs: 60_000,
  });
  if (!verdict.ok) {
    return NextResponse.json(
      { error: "too_many_requests" },
      { status: 429, headers: { ...HEADERS, "Retry-After": String(verdict.retryAfterSeconds) } },
    );
  }
  const created = await createDeviceAuthorization({ clientId, scope: params.scope ?? "" });
  return NextResponse.json(
    {
      device_code: created.deviceCode,
      user_code: created.userCode,
      verification_uri: created.verificationUri,
      expires_in: created.expiresIn,
      interval: created.interval,
    },
    { headers: HEADERS },
  );
}
