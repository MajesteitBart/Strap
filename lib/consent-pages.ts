import type { SpaceOption } from "@/components/strap/authorize-space-picker";
import { getAgentIconKind } from "@/lib/agent-icon";
import { resolveInviteByToken, type InviterProfile } from "@/lib/company-invites";
import { isDatabaseConfigured } from "@/lib/env";
import { getOAuthClient, isAllowedRedirectUri } from "@/lib/oauth";
import { getDeviceApproval } from "@/lib/oauth-device";
import type { HeadlessKeyMode } from "@/lib/headless-access-shared";
import { deviceGrantModesForScope } from "@/lib/oauth-device-shared";
import { getRequestAuth } from "@/lib/request-auth";
import { getAvatarInitials, getAvatarUrl, getUserName } from "@/lib/strap-backend";
import type { AgentIconKind } from "@/lib/strap-data";
import { listUserStraps } from "@/lib/strap-membership";
import "server-only";

// Server-side decisions for the consent pages (/authorize, /device and
// /invite/$token). Each returns a view model; the route renders it. The pages
// render only: the decisions are POSTed to their own handlers, which re-check
// the session and the request.

export type SearchValues = Record<string, string>;

export type AuthorizeView =
  | { kind: "unavailable" }
  | { kind: "invalid-request" }
  | { kind: "unverified-client" }
  | { kind: "sign-in"; clientName: string; returnTo: string }
  | { kind: "setup-first"; clientName: string }
  | {
      kind: "consent";
      clientName: string;
      iconKind: AgentIconKind;
      userEmail: string;
      spaces: SpaceOption[];
      showPicker: boolean;
      clientId: string;
      redirectUri: string;
      codeChallenge: string;
      state?: string;
      scope?: string;
    };

export async function loadAuthorizeView(params: SearchValues): Promise<AuthorizeView> {
  if (!isDatabaseConfigured()) return { kind: "unavailable" };

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
    return { kind: "invalid-request" };
  }

  const client = await getOAuthClient(clientId);
  if (!client || !isAllowedRedirectUri(redirectUri, client.redirectUris)) {
    return { kind: "unverified-client" };
  }

  // Reconstruct this page's own URL so a signed-out user returns here after
  // signing in.
  const returnParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) returnParams.set(key, value);
  const returnTo = `/authorize?${returnParams.toString()}`;

  const { context, user } = await getRequestAuth();
  if (!user) return { kind: "sign-in", clientName: client.clientName, returnTo };

  // The spaces the user can grant this agent. A solo user (Personal Strap only)
  // sees no picker - the decision route grants their one space by default, which
  // keeps the connect flow a single click. A user in one or more Company Straps
  // gets the picker so they can scope the agent to personal or one company (a
  // connection reaches exactly one Strap).
  const creeds = await listUserStraps(context, user.id);
  if (creeds.length === 0) return { kind: "setup-first", clientName: client.clientName };

  // Show each space by its real name - the person's name for their personal
  // Strap (mirroring the app switcher), the company name for a Company Strap -
  // never a generic "Personal"/"Company" label, since the owner knows which is
  // which.
  const spaces: SpaceOption[] = creeds.map((creed) => ({
    id: creed.id,
    label: creed.type === "personal" ? getUserName(user) : creed.name,
    type: creed.type,
    avatarInitials: getAvatarInitials(creed.type === "personal" ? getUserName(user) : creed.name),
    avatarUrl: creed.type === "personal" ? getAvatarUrl(user) : creed.avatarUrl,
  }));

  return {
    kind: "consent",
    clientName: client.clientName,
    iconKind: getAgentIconKind(client.clientName),
    userEmail: user.email,
    spaces,
    showPicker: spaces.length > 1,
    clientId,
    redirectUri,
    codeChallenge,
    ...(params.state ? { state: params.state } : {}),
    ...(params.scope ? { scope: params.scope } : {}),
  };
}

export type DeviceView =
  | { kind: "sign-in" }
  | { kind: "result"; approved: boolean }
  | {
      kind: "approve";
      requestId: string;
      clientName: string;
      creeds: Array<{ id: string; type: "personal" | "company"; name: string }>;
      allowedModes: HeadlessKeyMode[];
    }
  | { kind: "enter-code"; error?: string };

export async function loadDeviceView(params: SearchValues): Promise<DeviceView> {
  const { user } = await getRequestAuth();
  if (!user) return { kind: "sign-in" };
  if (params.result) return { kind: "result", approved: params.result === "approved" };

  const approval = params.request ? await getDeviceApproval({ requestId: params.request, userId: user.id }) : null;
  if (approval) {
    return {
      kind: "approve",
      requestId: approval.request.id,
      clientName: approval.client.clientName,
      creeds: approval.creeds.map((creed) => ({ id: creed.id, type: creed.type, name: creed.name })),
      allowedModes: deviceGrantModesForScope(approval.request.scope),
    };
  }
  return { kind: "enter-code", ...(params.error ? { error: params.error } : {}) };
}

export type InviteView =
  | { kind: "unavailable" }
  | { kind: "inactive" }
  | { kind: "expired" }
  | { kind: "redirect"; to: string }
  | { kind: "wrong-email"; invitedEmail: string; userEmail: string }
  | {
      kind: "accept";
      token: string;
      companyName: string;
      role: "admin" | "member";
      inviter: InviterProfile;
      you: { avatarUrl?: string; initials: string; email: string };
    };

// Company invite landing. Resolves the invite by its raw token:
//   - no/expired/revoked invite -> a calm one-line message.
//   - signed out                -> bounce to /login with a return path.
//   - signed in, email matches  -> the accept card (Reject / Accept).
//   - signed in, email differs  -> tell them which email it was sent to.
export async function loadInviteView(token: string): Promise<InviteView> {
  if (!isDatabaseConfigured()) return { kind: "unavailable" };

  const resolved = await resolveInviteByToken(token);
  if (!resolved || resolved.invite.status !== "pending") return { kind: "inactive" };
  if (resolved.expired) return { kind: "expired" };

  const { user } = await getRequestAuth();
  // Return here after signing in / creating an account.
  if (!user) return { kind: "redirect", to: `/login?next=${encodeURIComponent(`/invite/${token}`)}` };

  const userEmail = user.email?.trim().toLowerCase() ?? "";
  if (userEmail !== resolved.invite.email.trim().toLowerCase()) {
    return { kind: "wrong-email", invitedEmail: resolved.invite.email, userEmail };
  }

  const youName = getUserName(user);
  return {
    kind: "accept",
    token,
    companyName: resolved.companyName,
    role: resolved.invite.role,
    inviter: resolved.inviter ?? { name: "A teammate", initials: getAvatarInitials("A teammate"), avatarUrl: undefined },
    you: { avatarUrl: getAvatarUrl(user), initials: getAvatarInitials(youName), email: user.email ?? "" },
  };
}
