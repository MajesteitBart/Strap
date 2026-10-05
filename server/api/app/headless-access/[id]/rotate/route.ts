import { requireApiAuth } from "@/lib/api-auth";
import { rotateHeadlessAccessKey } from "@/lib/headless-access";
import { recordAuditEvent } from "@/lib/audit-log";

type Context = { params: Promise<{ id: string }> };
const NO_STORE = { "Cache-Control": "no-store" } as const;

/** Returns the new key value once. The previous value stops working immediately. */
export async function POST(request: Request, context: Context) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;
  const { id } = await context.params;
  if (!id) return Response.json({ error: "Key id is required." }, { status: 400, headers: NO_STORE });
  const rotated = await rotateHeadlessAccessKey({ userId: auth.user.id, keyId: id }).catch(() => undefined);
  if (rotated === undefined) return Response.json({ error: "Could not rotate API key." }, { status: 500, headers: NO_STORE });
  if (rotated.status === "not-found") {
    return Response.json({ error: "Key not found, revoked, or expired." }, { status: 404, headers: NO_STORE });
  }
  if (rotated.status === "conflict") {
    return Response.json({ error: "This key was rotated by another request. Reload to see its current state." }, { status: 409, headers: NO_STORE });
  }
  void recordAuditEvent({
    userId: auth.user.id,
    action: "headless.key_rotated",
    metadata: { keyId: id, creedId: rotated.metadata.creedId },
    request,
  });
  return Response.json({ key: rotated.key, metadata: rotated.metadata }, { headers: NO_STORE });
}
