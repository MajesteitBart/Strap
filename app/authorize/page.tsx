import Link from "next/link";
import { IntegrationGlyph, StrapWordmark } from "@/components/strap/brand";
import { AuthorizeSpacePicker, type SpaceOption } from "@/components/strap/authorize-space-picker";
import { Button } from "@/components/ui/button";
import { getAgentIconKind } from "@/lib/agent-icon";
import { getOAuthClient, isAllowedRedirectUri } from "@/lib/oauth";
import {
  getAvatarInitials,
  getAvatarUrl,
  getUserName,
} from "@/lib/strap-backend";
import { listUserStraps } from "@/lib/strap-membership";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--strap-background)] text-[var(--strap-text-primary)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
        <StrapWordmark className="mb-10 h-[20px]" />
        <div className="w-full rounded-[var(--radius-xl)] bg-[var(--strap-surface)] p-7 text-center">
          {children}
        </div>
      </div>
    </div>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <>
      <h1 className="text-[18px] font-medium text-[var(--strap-text-primary)]">{title}</h1>
      <p className="mt-3 text-[14px] leading-7 text-[var(--strap-text-secondary)]">{body}</p>
    </>
  );
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <Shell>
        <Message
          title="Connection unavailable"
          body="Strap is not fully configured on this deployment. Try again later."
        />
      </Shell>
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
      <Shell>
        <Message
          title="Invalid connection request"
          body="This connection link is missing required parameters or uses an unsupported method. Start the connection again from your agent."
        />
      </Shell>
    );
  }

  const client = await getOAuthClient(clientId);
  if (!client || !isAllowedRedirectUri(redirectUri, client.redirectUris)) {
    return (
      <Shell>
        <Message
          title="Invalid connection request"
          body="We couldn't verify the app requesting access. Start the connection again from your agent."
        />
      </Shell>
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Shell>
        <Message
          title="Sign in to connect"
          body={`Sign in to your Strap account to let ${client.clientName} read and update your Strap.`}
        />
        <div className="mt-6 flex justify-center">
          <Link
            href={`/login?next=${encodeURIComponent(returnTo)}`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--strap-text-primary)] px-5 text-[14px] font-medium text-[var(--strap-button-primary-fg)] transition-colors hover:bg-[var(--strap-button-primary-hover)]"
          >
            Log in
          </Link>
        </div>
      </Shell>
    );
  }

  const iconKind = getAgentIconKind(client.clientName);

  // The spaces the user can grant this agent. A solo user (Personal Strap only)
  // sees no picker - the decision route grants their one space by default, which
  // keeps the connect flow a single click. A user in one or more Company Straps
  // gets the picker so they can scope the agent to personal or one company (a
  // connection reaches exactly one Strap).
  const creeds = await listUserStraps(supabase, user.id);
  if (creeds.length === 0) {
    return (
      <Shell>
        <Message
          title="Set up your Strap first"
          body={`Finish creating your Strap before connecting ${client.clientName}. Then start the connection again from your agent.`}
        />
        <div className="mt-6 flex justify-center">
          <Link
            href="/onboarding"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--strap-text-primary)] px-5 text-[14px] font-medium text-[var(--strap-button-primary-fg)] transition-colors hover:bg-[var(--strap-button-primary-hover)]"
          >
            Set up Strap
          </Link>
        </div>
      </Shell>
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
    <Shell>
      <div className="flex items-center justify-center gap-4">
        <IntegrationGlyph kind="mcp" framed={false} className="h-14 w-14" />
        <span className="text-[18px] text-[var(--strap-text-tertiary)]">+</span>
        <IntegrationGlyph kind={iconKind} framed={false} className="h-14 w-14" />
      </div>

      <h1 className="mt-6 text-[18px] font-medium text-[var(--strap-text-primary)]">
        Connect {client.clientName} to your Strap
      </h1>
      <p className="mt-3 text-[14px] leading-7 text-[var(--strap-text-secondary)]">
        {client.clientName} can read your Strap and propose updates, and edits a
        section directly only where you allow direct edits.
      </p>
      <p className="mt-2 text-[13px] text-[var(--strap-text-tertiary)]">
        Signed in as {user.email}
      </p>

      <form method="post" action="/authorize/decision" className="mt-5">
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="redirect_uri" value={redirectUri} />
        <input type="hidden" name="code_challenge" value={codeChallenge} />
        {params.state ? <input type="hidden" name="state" value={params.state} /> : null}
        {params.scope ? <input type="hidden" name="scope" value={params.scope} /> : null}
        {showPicker ? <AuthorizeSpacePicker spaces={spaces} /> : null}
        <div className="mt-6 flex items-center gap-3">
          <Button
            type="submit"
            name="decision"
            value="deny"
            variant="secondary"
            className="h-9 flex-1 rounded-md"
          >
            Deny
          </Button>
          <Button
            type="submit"
            name="decision"
            value="allow"
            className="h-9 flex-1 rounded-md bg-[var(--strap-accent)] text-white hover:bg-[var(--strap-accent-hover)]"
          >
            Allow
          </Button>
        </div>
      </form>
    </Shell>
  );
}
