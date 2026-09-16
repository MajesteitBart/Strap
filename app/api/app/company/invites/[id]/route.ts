import * as tables from "@/db/schema/application";
import { requireApiAuth } from "@/lib/api-auth";
import { recordAuditEvent } from "@/lib/audit-log";
import { revokeInvite, rotateInviteToken } from "@/lib/company-invites";
import { maybeOne, query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import { sendEmail } from "@/lib/email";
import { companyInviteSubject, renderCompanyInviteEmail } from "@/lib/email-templates/company-invite";
import { getSiteUrl } from "@/lib/env";
import { getDisplayName } from "@/lib/user-name";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

async function resolveCreedId(inviteId: string): Promise<string | null> {
  const admin = serviceContext("app/api/app/company/invites/[id]/route.ts");
  const { data } = (await query(admin, tables.creed_invites, "select", (database, scope) => database.select({ creed_id: tables.creed_invites.creed_id }).from(tables.creed_invites).where(and(scope, eq(tables.creed_invites.id, inviteId)))).then(maybeOne)) as { data: { creed_id: string } | null };
  return data?.creed_id ?? null;
}

// DELETE /api/app/company/invites/[id] - revoke a pending invite (owner/admin).
export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const creedId = await resolveCreedId(id);
  if (!creedId) return NextResponse.json({ error: "Invite not found." }, { status: 404 });

  const result = await revokeInvite({ creedId, actorUserId: auth.user.id, inviteId: id });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });

  await recordAuditEvent({
    userId: auth.user.id,
    action: "company.invite_revoked",
    metadata: { creedId, inviteId: id },
  });
  return NextResponse.json({ ok: true });
}

// POST /api/app/company/invites/[id] { action: "resend" } - rotate token + email.
export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const creedId = await resolveCreedId(id);
  if (!creedId) return NextResponse.json({ error: "Invite not found." }, { status: 404 });

  const rotated = await rotateInviteToken({ creedId, actorUserId: auth.user.id, inviteId: id });
  if (!rotated.ok) return NextResponse.json({ error: rotated.error }, { status: 403 });

  const admin = serviceContext("app/api/app/company/invites/[id]/route.ts");
  const { data: creed } = (await query(admin, tables.creeds, "select", (database, scope) => database.select({ name: tables.creeds.name }).from(tables.creeds).where(and(scope, eq(tables.creeds.id, creedId)))).then(maybeOne)) as { data: { name: string } | null };
  const inviterName = getDisplayName(auth.user, "A teammate");
  const siteUrl = getSiteUrl();
  const companyName = creed?.name ?? "the company";
  const sent = await sendEmail({
    to: rotated.email,
    subject: companyInviteSubject(companyName),
    html: renderCompanyInviteEmail({
      companyName,
      inviterName,
      acceptUrl: `${siteUrl}/invite/${rotated.token}`,
      siteUrl,
    }),
  });

  await recordAuditEvent({
    userId: auth.user.id,
    action: "company.invite_resent",
    metadata: { creedId, inviteId: id, emailSent: sent.ok },
    request,
  });
  return NextResponse.json({ ok: true, emailSent: sent.ok });
}
