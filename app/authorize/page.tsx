import { AuthorizeSpacePicker, type SpaceOption } from "@/components/strap/authorize-space-picker";
import { IntegrationGlyph } from "@/components/strap/brand";
import { ConsentMessage, ConsentShell } from "@/components/strap/consent-shell";
import { getAgentIconKind } from "@/lib/agent-icon";
import { isDatabaseConfigured } from "@/lib/env";
import { getOAuthClient, isAllowedRedirectUri } from "@/lib/oauth";
import { getRequestAuth, getRequestDatabaseContext } from "@/lib/request-auth";
import {
  getAvatarInitials,
  getAvatarUrl,
  getUserName,
} from "@/lib/strap-backend";
import { listUserStraps } from "@/lib/strap-membership";
import Link from "next/link";

// Strap-branded OAuth consent screen. A signed-in, set-up user sees a single
// Allow / Deny choice with the connecting client's icon. The page renders only;
// the Allow / Deny POST is handled by ./decision/route.ts, which re-resolves the
// user from the session and re-validates the client before issuing a code.
export const dynamic = "force-dynamic";

type SearchParams = {
  client_id?: string;
  redirect_uri?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  response_type?: string;
  state?: string;
  scope?: string;
};

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  if (!isDatabaseConfigured()) {
    return (
      <ConsentShell chip="Connect an agent" tone="warning">
        <ConsentMessage
          title="Connection unavailable"
          body="Strap is not fully configured on this deployment. Try again later."
        />
      </ConsentShell>
    );
  }

  const clientId = params.client_id ?? "";
  const redirectUri = params.redirect_uri ?? "";
  const codeChallenge = params.code_challenge ?? "";

  // Validate the request before showing anything. On a bad client or
  // redirect_uri we render an error and never redirect, so we can't be used as
  // an open redirector.
  if (
    !clientId ||
    !redirectUri ||
    !codeChallenge ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge) ||
    params.response_type !== "code" ||
    params.code_challenge_method !== "S256"
  ) {
    return (
      <ConsentShell chip="Connect an agent" tone="warning">
        <ConsentMessage
          title="Invalid connection request"
          body="This connection link is missing required parameters or uses an unsupported method. Start the connection again from your agent."
        />
      </ConsentShell>
    );
  }

  const client = await getOAuthClient(clientId);
  if (!client || !isAllowedRedirectUri(redirectUri, client.redirectUris)) {
    return (
      <ConsentShell chip="Connect an agent" tone="warning">
        <ConsentMessage
          title="Invalid connection request"
          body="We couldn't verify the app requesting access. Start the connection again from your agent."
        />
      </ConsentShell>
    );
  }

  // Reconstruct this page's own URL so a signed-out user returns here after
  // Google sign-in.
  const returnParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      returnParams.set(key, value);
    }
  }
  const returnTo = `/authorize?${returnParams.toString()}`;

  const context = await getRequestDatabaseContext();
  const {
    data: { user },
  } = await getRequestAuth().then(({ user }) => ({ data: { user } }));

  if (!user) {
    return (
      <ConsentShell chip="Connect an agent">
        <ConsentMessage
          title="Sign in to connect"
          body={`Sign in to your Strap account to let ${client.clientName} read and update your Strap.`}
        />
        <div className="strap-consent-actions strap-consent-actions-single">
          <Link
            href={`/login?next=${encodeURIComponent(returnTo)}`}
            className="strap-button strap-button-primary"
          >
            Log in
          </Link>
        </div>
      </ConsentShell>
    );
  }

  const iconKind = getAgentIconKind(client.clientName);

  // The spaces the user can grant this agent. A solo user (Personal Strap only)
  // sees no picker - the decision route grants their one space by default, which
  // keeps the connect flow a single click. A user in one or more Company Straps
  // gets the picker so they can scope the agent to personal or one company (a
  // connection reaches exactly one Strap).
  const creeds = await listUserStraps(context, user.id);
  if (creeds.length === 0) {
    return (
      <ConsentShell chip="Connect an agent">
        <ConsentMessage
          title="Set up your Strap first"
          body={`Finish creating your Strap before connecting ${client.clientName}. Then start the connection again from your agent.`}
        />
        <div className="strap-consent-actions strap-consent-actions-single">
          <Link href="/onboarding" className="strap-button strap-button-primary">
            Set up Strap
          </Link>
        </div>
      </ConsentShell>
    );
  }
  // Show each space by its real name - the person's name for their personal
  // Strap (mirroring the app switcher), the company name for a Company Strap -
  // never a generic "Personal"/"Company" label, since the owner knows which is
  // which.
  const spaces: SpaceOption[] = creeds.map((creed) => ({
    id: creed.id,
    label: creed.type === "personal" ? getUserName(user) : creed.name,
    type: creed.type,
    avatarInitials: getAvatarInitials(
      creed.type === "personal" ? getUserName(user) : creed.name,
    ),
    avatarUrl: creed.type === "personal" ? getAvatarUrl(user) : creed.avatarUrl,
  }));
  const showPicker = spaces.length > 1;

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
          <IntegrationGlyph kind={iconKind} framed={false} className="h-12 w-12" />
        </span>
      </div>

      <h1>Connect {client.clientName} to your Strap</h1>
      <p>
        {client.clientName} can read your Strap and propose updates, and edits a
        section directly only where you allow direct edits.
      </p>
      <p>This connection can also read shared skills. If you own the profile or administer its Company, it can publish skill versions when you request them.</p>
      <p className="strap-consent-meta">Signed in as {user.email}</p>

      <form method="post" action="/authorize/decision" className="strap-consent-form">
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="redirect_uri" value={redirectUri} />
        <input type="hidden" name="code_challenge" value={codeChallenge} />
        {params.state ? <input type="hidden" name="state" value={params.state} /> : null}
        {params.scope ? <input type="hidden" name="scope" value={params.scope} /> : null}
        {showPicker ? <AuthorizeSpacePicker spaces={spaces} /> : null}
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
