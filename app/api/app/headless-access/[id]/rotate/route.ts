import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { rotateHeadlessAccessKey } from "@/lib/headless-access";
import { recordAuditEvent } from "@/lib/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
const NO_STORE = { "Cache-Control": "no-store" } as const;

/** Returns the new key value once. The previous value stops working immediately. */
export async function POST(request: Request, context: Context) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Key id is required." }, { status: 400, headers: NO_STORE });
  const rotated = await rotateHeadlessAccessKey({ userId: auth.user.id, keyId: id }).catch(() => undefined);
  if (rotated === undefined) return NextResponse.json({ error: "Could not rotate API key." }, { status: 500, headers: NO_STORE });
  if (!rotated) return NextResponse.json({ error: "Key not found." }, { status: 404, headers: NO_STORE });
  void recordAuditEvent({
    userId: auth.user.id,
    action: "headless.key_rotated",
    metadata: { keyId: id, creedId: rotated.metadata.creedId },
    request,
  });
  return NextResponse.json(rotated, { headers: NO_STORE });
}
