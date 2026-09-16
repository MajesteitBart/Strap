import { ConsentMessage, ConsentShell } from "@/components/strap/consent-shell";
import { InviteAcceptCard } from "@/components/strap/invite-accept-card";
import { resolveInviteByToken } from "@/lib/company-invites";
import { isDatabaseConfigured } from "@/lib/env";
import { getRequestAuth } from "@/lib/request-auth";
import { getAvatarInitials, getAvatarUrl, getUserName } from "@/lib/strap-backend";
import Link from "next/link";
import { redirect } from "next/navigation";

// Company invite landing. Marketing-chrome-free, styled to match the MCP consent
// screen (/authorize): wordmark above a framed, centred card. Resolves the
// invite by its raw token on the server:
//   - no/expired/revoked invite -> a calm one-line message.
//   - signed out                -> bounce to /login with a return path.
//   - signed in, email matches  -> the accept card (Reject / Accept).
//   - signed in, email differs  -> tell them which email it was sent to.
export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!isDatabaseConfigured()) {
    return (
      <ConsentShell chip="Company invite" tone="warning">
        <ConsentMessage title="Invites unavailable" body="Invites are unavailable right now. Please try again later." />
      </ConsentShell>
    );
  }

  const resolved = await resolveInviteByToken(token);
  if (!resolved || resolved.invite.status !== "pending") {
    return (
      <ConsentShell chip="Company invite" tone="warning">
        <ConsentMessage
          title="This invite is no longer active"
          body="The link may have been used, revoked, or expired. Ask whoever invited you to send a new one."
        />
      </ConsentShell>
    );
  }

  if (resolved.expired) {
    return (
      <ConsentShell chip="Company invite" tone="warning">
        <ConsentMessage
          title="This invite has expired"
          body="Invites last 7 days. Ask whoever invited you to send a fresh link."
        />
      </ConsentShell>
    );
  }
  const {
    data: { user },
  } = await getRequestAuth().then(({ user }) => ({ data: { user } }));

  if (!user) {
    // Return here after signing in / creating an account.
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const userEmail = user.email?.trim().toLowerCase() ?? "";
  if (userEmail !== resolved.invite.email.trim().toLowerCase()) {
    return (
      <ConsentShell chip="Company invite" tone="agents">
        <ConsentMessage
          title="This invite is for a different email"
          body={`It was sent to ${resolved.invite.email}. Sign in with that email to accept it, or ask for a new invite to ${userEmail}.`}
        >
          <p className="strap-consent-foot">
            <Link href="/file" className="strap-link-plain">
              Go to your Strap
            </Link>
          </p>
        </ConsentMessage>
      </ConsentShell>
    );
  }

  const youName = getUserName(user);

  return (
    <ConsentShell chip="Company invite" tone="agents">
      <InviteAcceptCard
        token={token}
        companyName={resolved.companyName}
        role={resolved.invite.role}
        inviter={
          resolved.inviter ?? { name: "A teammate", initials: getAvatarInitials("A teammate"), avatarUrl: undefined }
        }
        you={{ avatarUrl: getAvatarUrl(user), initials: getAvatarInitials(youName), email: user.email ?? "" }}
      />
    </ConsentShell>
  );
}
