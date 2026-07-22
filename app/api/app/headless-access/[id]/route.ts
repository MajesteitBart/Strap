import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { revokeHeadlessAccessKey } from "@/lib/headless-access";
import { recordAuditEvent } from "@/lib/audit-log";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: Context) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Key id is required." }, { status: 400 });
  const revoked = await revokeHeadlessAccessKey({ userId: auth.user.id, keyId: id });
  if (!revoked) return NextResponse.json({ error: "Key not found." }, { status: 404 });
  void recordAuditEvent({
    userId: auth.user.id,
    action: "headless.key_revoked",
    metadata: { keyId: id },
    request,
  });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
