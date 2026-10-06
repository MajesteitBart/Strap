import { requireApiAuth } from "@/lib/api-auth";
import { declineInvite } from "@/lib/company-invites";
import { recordAuditEvent } from "@/lib/audit-log";

// POST /api/app/company/invites/decline { token } - the signed-in user declines
// an invite addressed to their email. Marks it revoked (freeing the seat) after
// an email-match check in the lib.
export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const token = body && typeof body === "object" && "token" in body ? (body as { token: unknown }).token : null;
  if (typeof token !== "string" || token.length === 0) {
    return Response.json({ error: "token is required." }, { status: 400 });
  }

  const result = await declineInvite(token, auth.user);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  await recordAuditEvent({
    userId: auth.user.id,
    action: "company.invite_declined",
    metadata: {},
    request,
  });

  return Response.json({ ok: true });
}
