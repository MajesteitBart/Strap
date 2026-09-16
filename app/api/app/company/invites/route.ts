import * as tables from "@/db/schema/application";
import { requireApiAuth } from "@/lib/api-auth";
import { recordAuditEvent } from "@/lib/audit-log";
import { createInvite } from "@/lib/company-invites";
import { maybeOne, query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import { sendEmail } from "@/lib/email";
import { companyInviteSubject, renderCompanyInviteEmail } from "@/lib/email-templates/company-invite";
import { getSiteUrl } from "@/lib/env";
import { readStrapId } from "@/lib/strap-api";
import { getDisplayName } from "@/lib/user-name";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// POST /api/app/company/invites { creedId, email, role } - owner/admin.
// Creates a pending invite (seat + freeze checked in the lib) and emails the
// branded link. Email failure does not fail the request: the invite is created
// and can be resent.
export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as {
    strapId?: unknown;
    creedId?: unknown;
    email?: unknown;
    role?: unknown;
  };
  const creedId = readStrapId(b) ?? "";
  const email = typeof b.email === "string" ? b.email : "";
  const role = b.role === "admin" ? "admin" : "member";
  if (!creedId || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const result = await createInvite({ creedId, actorUserId: auth.user.id, email, role });
  if (!result.ok) {
    const status = result.code === "forbidden" ? 403 : 400;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  // Compose + send the invite email (best-effort).
  const admin = serviceContext("app/api/app/company/invites/route.ts");
  const { data: creed } = (await query(admin, tables.creeds, "select", (database, scope) => database.select({ name: tables.creeds.name }).from(tables.creeds).where(and(scope, eq(tables.creeds.id, creedId)))).then(maybeOne)) as { data: { name: string } | null };
  const inviterName = getDisplayName(auth.user, "A teammate");
  const siteUrl = getSiteUrl();
  const companyName = creed?.name ?? "the company";
  const sent = await sendEmail({
    to: email.trim(),
    subject: companyInviteSubject(companyName),
    html: renderCompanyInviteEmail({
      companyName,
      inviterName,
      acceptUrl: `${siteUrl}/invite/${result.token}`,
      siteUrl,
    }),
  });

  await recordAuditEvent({
    userId: auth.user.id,
    action: "company.invite_created",
    metadata: { creedId, email: email.trim().toLowerCase(), role, emailSent: sent.ok },
    request,
  });

  return NextResponse.json({ ok: true, inviteId: result.inviteId, emailSent: sent.ok });
}
