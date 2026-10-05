import Link from "@/components/link";
import { AuthorizeSpacePicker } from "@/components/strap/authorize-space-picker";
import { IntegrationGlyph } from "@/components/strap/brand";
import { ConsentMessage, ConsentShell } from "@/components/strap/consent-shell";
import { createFileRoute } from "@tanstack/react-router";
import { getAuthorizeView } from "../../functions/consent";

// Strap-branded OAuth consent screen. A signed-in, set-up user sees a single
// Allow / Deny choice with the connecting client's icon. The page renders only;
// the Allow / Deny POST is handled by /authorize/decision, which re-resolves the
// user from the session and re-validates the client before issuing a code.
export const Route = createFileRoute("/authorize/")({
  loaderDeps: ({ search }) => ({ search: search as Record<string, unknown> }),
  loader: ({ deps }) => getAuthorizeView({ data: deps.search }),
  gcTime: 0,
  component: AuthorizePage,
});

function AuthorizePage() {
  const view = Route.useLoaderData();

  if (view.kind === "unavailable") {
    return (
      <ConsentShell chip="Connect an agent" tone="warning">
        <ConsentMessage
          title="Connection unavailable"
          body="Strap is not fully configured on this deployment. Try again later."
        />
      </ConsentShell>
    );
  }

  if (view.kind === "invalid-request") {
    return (
      <ConsentShell chip="Connect an agent" tone="warning">
        <ConsentMessage
          title="Invalid connection request"
          body="This connection link is missing required parameters or uses an unsupported method. Start the connection again from your agent."
        />
      </ConsentShell>
    );
  }

  if (view.kind === "unverified-client") {
    return (
      <ConsentShell chip="Connect an agent" tone="warning">
        <ConsentMessage
          title="Invalid connection request"
          body="We couldn't verify the app requesting access. Start the connection again from your agent."
        />
      </ConsentShell>
    );
  }

  if (view.kind === "sign-in") {
    return (
      <ConsentShell chip="Connect an agent">
        <ConsentMessage
          title="Sign in to connect"
          body={`Sign in to your Strap account to let ${view.clientName} read and update your Strap.`}
        />
        <div className="strap-consent-actions strap-consent-actions-single">
          <Link
            href={`/login?next=${encodeURIComponent(view.returnTo)}`}
            className="strap-button strap-button-primary"
          >
            Log in
          </Link>
        </div>
      </ConsentShell>
    );
  }

  if (view.kind === "setup-first") {
    return (
      <ConsentShell chip="Connect an agent">
        <ConsentMessage
          title="Set up your Strap first"
          body={`Finish creating your Strap before connecting ${view.clientName}. Then start the connection again from your agent.`}
        />
        <div className="strap-consent-actions strap-consent-actions-single">
          <Link href="/onboarding" className="strap-button strap-button-primary">
            Set up Strap
          </Link>
        </div>
      </ConsentShell>
    );
  }

  return (
    <ConsentShell chip="Connect an agent">
      <div className="strap-consent-glyphs">
        <span className="strap-consent-glyph">
          <IntegrationGlyph kind="mcp" framed={false} className="h-12 w-12" />
        </span>
        <span className="strap-consent-glyph-join" aria-hidden="true">
          +
        </span>
        <span className="strap-consent-glyph">
          <IntegrationGlyph kind={view.iconKind} framed={false} className="h-12 w-12" />
        </span>
      </div>

      <h1>Connect {view.clientName} to your Strap</h1>
      <p>
        {view.clientName} can read your Strap and propose updates, and edits a
        section directly only where you allow direct edits.
      </p>
      <p>This connection can also read shared skills. If you own the profile or administer its Company, it can publish skill versions when you request them.</p>
      <p className="strap-consent-meta">Signed in as {view.userEmail}</p>

      <form method="post" action="/authorize/decision" className="strap-consent-form">
        <input type="hidden" name="client_id" value={view.clientId} />
        <input type="hidden" name="redirect_uri" value={view.redirectUri} />
        <input type="hidden" name="code_challenge" value={view.codeChallenge} />
        {view.state ? <input type="hidden" name="state" value={view.state} /> : null}
        {view.scope ? <input type="hidden" name="scope" value={view.scope} /> : null}
        {view.showPicker ? <AuthorizeSpacePicker spaces={view.spaces} /> : null}
        <div className="strap-consent-actions" style={{ marginTop: 0 }}>
          <button
            type="submit"
            name="decision"
            value="deny"
            className="strap-button strap-button-secondary"
          >
            Deny
          </button>
          <button
            type="submit"
            name="decision"
            value="allow"
            className="strap-button strap-button-primary"
          >
            Allow
          </button>
        </div>
      </form>
    </ConsentShell>
  );
}
