import Link from "@/components/link";
import { ConsentMessage, ConsentShell } from "@/components/strap/consent-shell";
import { InviteAcceptCard } from "@/components/strap/invite-accept-card";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getInviteView } from "../../functions/consent";

// Company invite landing. Marketing-chrome-free, styled to match the MCP consent
// screen (/authorize): wordmark above a framed, centred card.
export const Route = createFileRoute("/invite/$token")({
  loader: async ({ params }) => {
    const view = await getInviteView({ data: { token: params.token } });
    if (view.kind === "redirect") throw redirect({ href: view.to, replace: true });
    return view;
  },
  gcTime: 0,
  component: InvitePage,
});

function InvitePage() {
  const view = Route.useLoaderData();

  if (view.kind === "unavailable") {
    return (
      <ConsentShell chip="Company invite" tone="warning">
        <ConsentMessage title="Invites unavailable" body="Invites are unavailable right now. Please try again later." />
      </ConsentShell>
    );
  }

  if (view.kind === "inactive") {
    return (
      <ConsentShell chip="Company invite" tone="warning">
        <ConsentMessage
          title="This invite is no longer active"
          body="The link may have been used, revoked, or expired. Ask whoever invited you to send a new one."
        />
      </ConsentShell>
    );
  }

  if (view.kind === "expired") {
    return (
      <ConsentShell chip="Company invite" tone="warning">
        <ConsentMessage
          title="This invite has expired"
          body="Invites last 7 days. Ask whoever invited you to send a fresh link."
        />
      </ConsentShell>
    );
  }

  if (view.kind === "wrong-email") {
    return (
      <ConsentShell chip="Company invite" tone="agents">
        <ConsentMessage
          title="This invite is for a different email"
          body={`It was sent to ${view.invitedEmail}. Sign in with that email to accept it, or ask for a new invite to ${view.userEmail}.`}
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

  return (
    <ConsentShell chip="Company invite" tone="agents">
      <InviteAcceptCard
        token={view.token}
        companyName={view.companyName}
        role={view.role}
        inviter={view.inviter}
        you={view.you}
      />
    </ConsentShell>
  );
}
