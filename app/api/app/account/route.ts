import { users } from "@/db/schema/auth";
import { requireApiAuth } from "@/lib/api-auth";
import { recordAuditEvent } from "@/lib/audit-log";
import { getAuthServer } from "@/lib/auth/server";
import type { DatabaseContext } from "@/lib/db/context";
import { serviceContext } from "@/lib/db/service";
import { checkLegacyDeletion } from "@/lib/legacy-subscription-deletion";
import { log } from "@/lib/observability";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  // Authenticated session is the gate. The UI already double-confirms via
  // the dialog (open + Confirm), and the user can only act on their own
  // record because `requireApiAuth` returns the signed-in user.
  try {
    const admin = serviceContext("app/api/app/account/route.ts");

    const blocker = await checkLegacyDeletion(admin as unknown as DatabaseContext,
      { scope: "account", userId: auth.user.id });
    if (blocker) return NextResponse.json({ error: blocker.error }, { status: blocker.status });

    // Audit BEFORE delete since the user row will be cascaded away.
    await recordAuditEvent({
      userId: auth.user.id,
      action: "account.deleted",
      request,
      metadata: { email: auth.user.email },
    });

    const signout = await getAuthServer().api.signOut({ headers: request.headers, asResponse: true });
    if (!signout.ok) return signout;
    await auth.context.database.delete(users).where(eq(users.id, auth.user.id));

    const response = NextResponse.json({ ok: true });
    for (const cookie of signout.headers.getSetCookie()) response.headers.append("Set-Cookie", cookie);
    return response;
  } catch (error) {
    log.error("account_delete_failed", { userId: auth.user.id }, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete account." },
      { status: 500 }
    );
  }
}
