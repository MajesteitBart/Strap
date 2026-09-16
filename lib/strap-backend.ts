import * as tables from "@/db/schema/application";
import {
  getAgentIconKind,
  type CliAttributableAgentId,
} from "@/lib/agent-icon";
import type { User } from "@/lib/auth/user";
import { authorizeValues } from "@/lib/authz/policies";
import { AccessDeniedError } from "@/lib/authz/viewer";
import { readCompanyGitHubIntegration } from "@/lib/company-github";
import { getDatabase } from "@/lib/db/client";
import type { DatabaseContext } from "@/lib/db/context";
import { viewerContext } from "@/lib/db/context";
import { callProcedure } from "@/lib/db/procedures";
import { conflictSet, exactlyOne, maybeOne, query } from "@/lib/db/query";
import { companyVersionControl } from "@/lib/db/repositories/company";
import { findUser } from "@/lib/db/repositories/users";
import { serviceContext } from "@/lib/db/service";
import { getSiteUrl } from "@/lib/env";
import { isGitHubOAuthAppConfigured } from "@/lib/github";
import { log } from "@/lib/observability";
import { STRAP_FILE_NAME } from "@/lib/profile-file";
import { richTextContentEquivalent } from "@/lib/rich-text";
import { decryptSecret, encryptSecret, hashSecret } from "@/lib/secret-crypto";
import {
  buildAgentReadPayload,
  inferSectionTemplate,
  initialOnboardingState,
  initialStrapState,
  legacyPayloadToRichTextContent,
  normalizeAgentPermission,
  normalizeLegacyAccent,
  normalizeLegacyProposalDraft,
  normalizeLegacySectionId,
  permissionToWritable,
  type AccentKey,
  type ActivityEntry,
  type ActivityStatus,
  type ActorType,
  type AgentIconKind,
  type AgentPermission,
  type CompanyContext,
  type ConnectionItem,
  type GitHubSyncStatus,
  type McpClient,
  type Proposal,
  type SectionTemplate,
  type StrapMemberSummary,
  type StrapSection,
  type StrapState,
  type StrapSwitcherItem,
} from "@/lib/strap-data";
import type { StrapSummary } from "@/lib/strap-membership";
import { getPersonalStrapId, getStrapRole } from "@/lib/strap-membership";
import {
  resolveSectionPermission,
  type StrapRole,
} from "@/lib/strap-permissions";
import { getDisplayName } from "@/lib/user-name";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { cache } from "react";
import "server-only";

type SectionRow = {
  user_id: string;
  section_id: string;
  position: number;
  // The DB has legacy kinds (chips, rules, decisions, focus) on older rows;
  // hydrateSection migrates them all to "rich-text" for the in-memory model.
  kind: string;
  name: string;
  accent: AccentKey;
  payload: Record<string, unknown>;
  agent_permission?: string | null;
  archived_at?: string | null;
  last_edited_by: string;
  last_edited_type: ActorType;
  last_edited_at: string;
  revision: number;
  created_at: string;
  updated_at: string;
};

type ProposalRow = {
  id: string;
  user_id: string;
  section_id: Proposal["sectionId"];
  section_name: string;
  accent: AccentKey;
  agent_name: string;
  change_type: Proposal["changeType"];
  reason: string;
  impact: Proposal["impact"];
  confidence: Proposal["confidence"];
  draft: Proposal["draft"];
  status: Proposal["status"];
  base_revision: number | null;
  created_at: string;
  updated_at: string;
  // Company only: set to the member's id for a manual (human-typed) proposal;
  // null for agent proposals. The sole signal that distinguishes the two.
  author_user_id?: string | null;
};

type ActivityRow = {
  id: string;
  user_id: string;
  proposal_id: string | null;
  section_id: ActivityEntry["sectionId"];
  section_name: string;
  accent: AccentKey;
  actor: string;
  actor_type: ActorType;
  summary: string;
  status: ActivityEntry["status"];
  change_type: ActivityEntry["changeType"];
  reason: string;
  impact: ActivityEntry["impact"];
  confidence: ActivityEntry["confidence"];
  before_text: string | null;
  after_text: string | null;
  created_at: string;
  // Company only: the actor's user id (for avatar lookup) + the event kind
  // (content edits/proposals vs admin config events, which the sidebar hides).
  actor_user_id?: string | null;
  event_kind?: string | null;
};

type ConnectionRow = {
  user_id: string;
  connection_id: string;
  status: ConnectionItem["status"];
  last_seen_at: string | null;
  last_agent_name: string | null;
  observed_via: "read" | "proposal" | null;
  created_at: string;
  updated_at: string;
};

type TokenRow = {
  user_id: string;
  read_token: string | null;
  proposal_token: string | null;
  direct_edit_token?: string | null;
  read_token_hash?: string | null;
  proposal_token_hash?: string | null;
  direct_edit_token_hash?: string | null;
  encrypted_read_token?: string | null;
  encrypted_proposal_token?: string | null;
  encrypted_direct_edit_token?: string | null;
  require_approval: boolean;
  created_at: string;
  updated_at: string;
};

type McpClientRow = {
  user_id: string;
  client_id: string;
  client_name: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

type IntegrationRow = {
  user_id: string;
  provider: "github";
  status: "connected" | "not-connected" | "disconnected";
  provider_account_id: string | null;
  provider_login: string | null;
  access_token: string | null;
  refresh_token: string | null;
  encrypted_access_token?: string | null;
  encrypted_refresh_token?: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type VersionControlRow = {
  provider: "github";
  repo_owner: string | null;
  repo_name: string | null;
  branch: string | null;
  path: string;
  last_remote_sha: string | null;
  last_remote_message: string | null;
  last_remote_committed_at: string | null;
  last_synced_content_hash: string | null;
  sync_status: GitHubSyncStatus;
  created_at: string;
  updated_at: string;
};

type PersistResult = {
  state: StrapState;
  hasPersistedCreed: boolean;
};

const KNOWN_CONNECTIONS = [
  "claude",
  "claudecode",
  "codex",
  "chatgpt",
  "cursor",
  "devin",
  "replit",
  "whirl",
  "grok",
  "v0",
  "opencode",
  "openclaw",
  "hermes",
  "factory",
  "manus",
  "custom",
  "mcp",
] as const;

function assertNoError(error: { message: string } | null, fallback: string) {
  if (error) {
    throw new Error(error.message || fallback);
  }
}

async function readTokenRow(client: DatabaseContext, userId: string) {
  const { data, error } = await query(client, tables.creed_tokens, "select", (database, scope) => database.select().from(tables.creed_tokens).where(and(scope, eq(tables.creed_tokens.user_id, userId)))).then(maybeOne);

  assertNoError(error, "Could not load Strap tokens.");
  const row = (data as TokenRow | null) ?? null;
  return row ? resolveTokenRow(row) : null;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toRelativeTime(timestamp?: string | null) {
  if (!timestamp) {
    return undefined;
  }

  const deltaMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.max(Math.round(deltaMs / 60000), 0);

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  if (days === 1) {
    return "1 day ago";
  }

  return `${days} days ago`;
}

function toDayLabel(timestamp?: string | null) {
  if (!timestamp) {
    return "Today";
  }

  const deltaMs = Date.now() - new Date(timestamp).getTime();
  const days = Math.floor(deltaMs / 86_400_000);

  if (days <= 0) {
    return "Today";
  }

  if (days === 1) {
    return "Yesterday";
  }

  return "Earlier";
}

export function getUserName(user: User) {
  return getDisplayName(user);
}

export function getAvatarUrl(user: User) {
  return user.avatarUrl?.trim() || user.image?.trim() || undefined;
}

function getIdentityData(
  user: User,
  provider: "google" | "github",
): Record<string, unknown> {
  const identities =
    (
      user as User & {
        identities?: Array<{
          provider?: string;
          identity_data?: Record<string, unknown> | null;
        }>;
      }
    ).identities ?? [];

  return (
    identities.find((identity) => identity.provider === provider)
      ?.identity_data ?? {}
  );
}

function buildIntegrationSettings(
  user: User,
  githubRow?: IntegrationRow | null,
  options?: { ignoreLinkedIdentity?: boolean },
): StrapState["settings"]["integrations"] {
  // In company mode the GitHub connection is the TEAM's, not the caller's, so we
  // derive status purely from the passed row and never from the user's linked
  // GitHub identity (which would otherwise mark a team "connected" just because
  // the manager linked their own GitHub for sign-in).
  const ignoreLinkedIdentity = options?.ignoreLinkedIdentity ?? false;
  const githubIdentity = ignoreLinkedIdentity
    ? {}
    : getIdentityData(user, "github");
  const identityLogin =
    (typeof githubIdentity.user_name === "string"
      ? githubIdentity.user_name
      : undefined) ??
    (typeof githubIdentity.preferred_username === "string"
      ? githubIdentity.preferred_username
      : undefined);
  const githubLogin = githubRow?.provider_login ?? identityLogin;
  const hasLinkedGitHubIdentity = ignoreLinkedIdentity
    ? false
    : Boolean(
        identityLogin ||
        (typeof githubIdentity.sub === "string" && githubIdentity.sub.trim()) ||
        (typeof githubIdentity.id === "string" && githubIdentity.id.trim()),
      );

  return {
    google: {
      provider: "google",
      label: "Google",
      status: "connected",
      disconnectable: false,
      accountLabel: user.email ?? undefined,
    },
    github: {
      provider: "github",
      label: "GitHub",
      status:
        githubRow?.status === "connected" || hasLinkedGitHubIdentity
          ? "connected"
          : githubRow?.status === "disconnected"
            ? "disconnected"
            : "not-connected",
      disconnectable: true,
      accountLabel: githubLogin,
    },
  };
}

function buildVersionControlSettings(
  row?: VersionControlRow | null,
): StrapState["settings"]["versionControl"] {
  return {
    provider: "github",
    repoOwner: row?.repo_owner ?? "",
    repoName: row?.repo_name ?? "",
    branch: row?.branch ?? "",
    path: row?.path?.trim() || STRAP_FILE_NAME,
    lastRemoteSha: row?.last_remote_sha ?? undefined,
    lastRemoteMessage: row?.last_remote_message ?? undefined,
    lastRemoteCommittedAt: row?.last_remote_committed_at ?? undefined,
    lastSyncedContentHash: row?.last_synced_content_hash ?? undefined,
    syncStatus: row?.sync_status ?? "not-configured",
  };
}

async function readGithubIntegrationRow(
  client: DatabaseContext,
  userId: string,
) {
  const { data, error } = await query(client, tables.creed_integrations, "select", (database, scope) => database.select().from(tables.creed_integrations).where(and(scope, eq(tables.creed_integrations.user_id, userId), eq(tables.creed_integrations.provider, "github")))).then(maybeOne);

  assertNoError(error, "Could not load GitHub integration.");
  const row = (data as IntegrationRow | null) ?? null;
  return row ? resolveGitHubIntegrationRow(row) : null;
}

async function readVersionControlRow(
  client: DatabaseContext,
  userId: string,
) {
  const { data, error } = await query(client, tables.creed_version_control, "select", (database, scope) => database.select().from(tables.creed_version_control).where(and(scope, eq(tables.creed_version_control.user_id, userId)))).then(maybeOne);

  assertNoError(error, "Could not load version control settings.");
  return (data as VersionControlRow | null) ?? null;
}

async function readMcpClientRows(client: DatabaseContext, userId: string, creedId?: string | null) {
  const { data, error } = await query(client, tables.creed_mcp_clients, "select", (database, scope) => database.select().from(tables.creed_mcp_clients)
    .where(and(scope, creedId ? eq(tables.creed_mcp_clients.creed_id, creedId) : eq(tables.creed_mcp_clients.user_id, userId)))
    .orderBy(desc(tables.creed_mcp_clients.last_seen_at)));
  assertNoError(error, "Could not load MCP clients.");
  return ((data as McpClientRow[] | null) ?? []).filter(row => row.client_name.trim().toLowerCase() !== "mcp client").map(hydrateMcpClient);
}

export async function readGitHubIntegration(client: DatabaseContext, userId: string) {
  return readGithubIntegrationRow(client, userId);
}

export async function readVersionControlConfig(
  client: DatabaseContext,
  userId: string,
) {
  return readVersionControlRow(client, userId);
}

export async function upsertGitHubIntegration(
  client: DatabaseContext,
  userId: string,
  input: {
    status?: "connected" | "not-connected" | "disconnected";
    providerAccountId?: string | null;
    providerLogin?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
    tokenExpiresAt?: string | null;
  },
) {
  const db = client;
  const now = new Date().toISOString();

  const accessToken = input.accessToken?.trim() || null;
  const refreshToken = input.refreshToken?.trim() || null;

  const { error } = await query(db, tables.creed_integrations, "insert", async (database, scope) => {
    const values = {
      user_id: userId,
      provider: "github",
      status: input.status ?? "connected",
      provider_account_id: input.providerAccountId ?? null,
      provider_login: input.providerLogin ?? null,
      access_token: null,
      refresh_token: null,
      encrypted_access_token: accessToken ? encryptSecret(accessToken) : null,
      encrypted_refresh_token: refreshToken
        ? encryptSecret(refreshToken)
        : null,
      token_expires_at: input.tokenExpiresAt ?? null,
      created_at: now,
      updated_at: now,
    } as typeof tables.creed_integrations.$inferInsert;
    await authorizeValues(db, tables.creed_integrations, "insert", values);
    return database.insert(tables.creed_integrations).values(values).onConflictDoUpdate({ target: [tables.creed_integrations.user_id, tables.creed_integrations.provider], set: conflictSet(tables.creed_integrations, values), setWhere: scope });
  });

  assertNoError(error, "Could not persist GitHub integration.");
}

export async function clearGitHubIntegration(client: DatabaseContext, userId: string) {
  const db = client;

  // Keep the integration row (status = 'disconnected') so the UI can show
  // "Disconnected" (previously connected) vs "Not connected" (never).
  // Tokens / provider identity are cleared so nothing reusable lingers.
  //
  // Deliberately *don't* delete `creed_version_control`. The repo/branch the
  // user picked is configuration they almost always want again on reconnect,
  // and re-finding their repo by hand is the friction reconnect should
  // avoid. We also flip its sync_status back to a neutral value so the
  // greyed-out UI doesn't claim it's still in sync.
  const [{ error: integrationError }, { error: versionControlError }] =
    await Promise.all([
      query(db, tables.creed_integrations, "update", async (database, scope) => {
    const values = {
          status: "disconnected",
          provider_account_id: null,
          provider_login: null,
          access_token: null,
          refresh_token: null,
          encrypted_access_token: null,
          encrypted_refresh_token: null,
          token_expires_at: null,
        } as Partial<typeof tables.creed_integrations.$inferInsert>;
    await authorizeValues(db, tables.creed_integrations, "update", values);
    return database.update(tables.creed_integrations).set(values).where(and(scope, eq(tables.creed_integrations.user_id, userId), eq(tables.creed_integrations.provider, "github")));
  }),
      query(db, tables.creed_version_control, "update", async (database, scope) => {
    const values = { sync_status: "unknown" } as Partial<typeof tables.creed_version_control.$inferInsert>;
    await authorizeValues(db, tables.creed_version_control, "update", values);
    return database.update(tables.creed_version_control).set(values).where(and(scope, eq(tables.creed_version_control.user_id, userId)));
  }),
    ]);

  assertNoError(integrationError, "Could not clear GitHub integration.");
  assertNoError(
    versionControlError,
    "Could not clear version control settings.",
  );
}

// Admin re-fetch of the user, cached per request by id. The personal load path
// enriches twice (loadActiveStrapState -> loadStrapState); keying the round-trip
// on the id (a string, so React cache() dedupes by value) collapses those into
// one getUserById per request.
const fetchEnrichedUser = cache(async (userId: string): Promise<User | null> => {
  try {
    const admin = serviceContext("lib/strap-backend.ts");
    const { data, error } = await findUser(admin, userId);
    if (error || !data.user) {
      return null;
    }
    return data.user;
  } catch {
    return null;
  }
});

async function enrichUserForState(user: User) {
  return (await fetchEnrichedUser(user.id)) ?? user;
}

export function getAvatarInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "CR";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function enrichCreedSwitcherItems(
  creeds: StrapSummary[],
  user: User,
): StrapSwitcherItem[] {
  const userName = getUserName(user);
  const userAvatarUrl = getAvatarUrl(user);

  return creeds.map((creed) => {
    const label = creed.type === "personal" ? userName : creed.name;
    return {
      ...creed,
      avatarInitials: getAvatarInitials(label),
      avatarUrl: creed.type === "personal" ? userAvatarUrl : creed.avatarUrl,
    };
  });
}

function generateToken(prefix: "xt_read" | "xt_proposal" | "xt_direct") {
  return `${prefix}_${randomBytes(18).toString("hex")}`;
}

function tokenFields(token: string) {
  return {
    token,
    hash: hashSecret(token),
    encrypted: encryptSecret(token),
  };
}

// Decrypt-only. The earlier plaintext-column fallback was removed so a DB
// dump can never surface live tokens without the AES-256-GCM secret.
//
// Two failure modes both resolve to `""`, which the upgrade-on-read path
// in `ensureTokenRow` uses as the signal to regenerate fresh tokens:
//   1. `encrypted` column is null - legacy row never written by the
//      current code path.
//   2. `decryptSecret` throws - the ciphertext was written with a
//      different `CREED_ENCRYPTION_SECRET` than is currently set (i.e.
//      the key was rotated without clearing the column). Self-heal here
//      so a rotation doesn't crash every signed-in request.
function resolveSecret(encrypted?: string | null, label = "secret") {
  if (!encrypted) return "";
  try {
    return decryptSecret(encrypted, label);
  } catch (error) {
    log.warn("secret_decrypt_failed", {
      label,
      message: error instanceof Error ? error.message : String(error),
    });
    return "";
  }
}

function resolveTokenRow(row: TokenRow) {
  return {
    ...row,
    read_token: resolveSecret(row.encrypted_read_token, "read token"),
    proposal_token: resolveSecret(
      row.encrypted_proposal_token,
      "proposal token",
    ),
    direct_edit_token: resolveSecret(
      row.encrypted_direct_edit_token,
      "direct edit token",
    ),
  };
}

function resolveGitHubIntegrationRow(row: IntegrationRow) {
  return {
    ...row,
    access_token: resolveSecret(
      row.encrypted_access_token,
      "GitHub access token",
    ),
    refresh_token: resolveSecret(
      row.encrypted_refresh_token,
      "GitHub refresh token",
    ),
  };
}

function buildMcpUrl() {
  return `${getSiteUrl()}/mcp`;
}

function normalizeIntegrationId(value?: string | null) {
  if (!value) {
    return "custom";
  }

  const normalized = value.toLowerCase();
  return KNOWN_CONNECTIONS.includes(
    normalized as (typeof KNOWN_CONNECTIONS)[number],
  )
    ? (normalized as (typeof KNOWN_CONNECTIONS)[number])
    : "custom";
}

// A connecting client's id and its brand icon are the same vocabulary, so both
// resolve through the single alias table in lib/agent-icon. Keeping one source
// of truth means a new agent can't get an icon without also being a known
// connection id (which is what drives its connected/not-connected status).
function inferIntegrationId(agentName?: string | null): AgentIconKind {
  return getAgentIconKind(agentName);
}

export function inferAgentIconKind(agentName?: string | null): AgentIconKind {
  return getAgentIconKind(agentName);
}

export function normalizeMcpClientId(clientName?: string | null) {
  const icon = inferAgentIconKind(clientName);
  if (icon !== "custom") {
    return icon;
  }

  const normalized = (clientName ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    // Drop generic client-wrapper suffixes so the same custom agent resolves to
    // one id whether it identifies as "foo", "foo-mcp", or "foo-mcp-client".
    .replace(
      /-(mcp-client|mcp|client|cli|vscode|extension|desktop|app|bot)$/u,
      "",
    )
    .replace(/-$/u, "")
    .slice(0, 48);

  return normalized || "custom";
}

function hydrateMcpClient(row: McpClientRow): McpClient {
  return {
    id: row.client_id,
    name: row.client_name,
    icon: inferAgentIconKind(row.client_name),
    lastUsed: toRelativeTime(row.last_seen_at) ?? undefined,
  };
}

function buildReadUrl() {
  // Credentials belong in the Authorization header. Keeping the endpoint and
  // bearer separate prevents secrets leaking through history, referrers, and
  // request logs. /api/creed remains a compatibility alias.
  return `${getSiteUrl()}/api/strap`;
}

function buildProposalUrl() {
  return `${getSiteUrl()}/api/strap/proposals`;
}

function buildDirectEditUrl() {
  return `${getSiteUrl()}/api/strap/write`;
}

function buildConnectionDefinitions() {
  // Per-agent buttons and command snippets are NOT built here: the client
  // provider snapshots this payload once per page load, so presentation baked
  // into it goes stale in open tabs under HMR. The cards derive their actions
  // from lib/connection-actions.ts instead; these definitions carry identity,
  // status, and fallback copy only.
  const remoteHint =
    "Add a custom MCP server pointing at the URL above, then authorize Strap in the browser window your client opens.";

  return {
    definitions: [
      {
        id: "chatgpt",
        name: "ChatGPT",
        icon: "chatgpt",
        description:
          "Add Strap as a connector so ChatGPT starts from your context.",
        connectHint:
          "In ChatGPT, open Settings > Apps & Connectors, turn on Developer mode, then Create a connector with the URL.",
      },
      {
        id: "claude",
        name: "Claude",
        icon: "claude",
        description: "Connect Strap as a custom connector in Claude.",
        connectHint:
          "In Claude, open Settings > Connectors > Add custom connector, paste the URL above, then Connect to authorize in the browser.",
      },
      {
        id: "codex",
        name: "Codex",
        icon: "codex",
        description:
          "Add Strap as a remote MCP server for agentic coding runs.",
        connectHint:
          "Run the command below, then codex mcp login strap to authorize in the browser. Existing local aliases named creed remain valid.",
      },
      {
        id: "claudecode",
        name: "Claude Code",
        icon: "claudecode",
        description:
          "Connect Strap so every Claude Code session starts with your context.",
        connectHint:
          "Run the command below (user scope, so every project gets it), then /mcp to authorize in the browser.",
      },
      {
        id: "openclaw",
        name: "OpenClaw",
        icon: "openclaw",
        description: "Add Strap to OpenClaw as a remote MCP server.",
        connectHint: remoteHint,
      },
      {
        id: "hermes",
        name: "Hermes",
        icon: "hermes",
        description: "Add Strap to Hermes as a remote MCP server.",
        connectHint: remoteHint,
      },
      {
        id: "manus",
        name: "Manus",
        icon: "manus",
        description: "Add Strap to Manus as a remote MCP server.",
        connectHint:
          "In Manus, open Settings > Connectors > Add custom MCP, enter the URL above with transport HTTP, then authorize.",
      },
      {
        id: "grok",
        name: "Grok",
        icon: "grok",
        description: "Add Strap to Grok as a custom connector.",
        connectHint:
          "In Grok, go to grok.com/connectors, create a New Connector > Custom, paste the URL above, and authorize.",
      },
      {
        id: "opencode",
        name: "OpenCode",
        icon: "opencode",
        description: "Add Strap to OpenCode as a remote MCP server.",
        connectHint:
          "Add the JSON below to opencode.json with the alias strap, then run opencode mcp auth strap to authorize in the browser. Existing local aliases named creed remain valid.",
      },
      {
        id: "cursor",
        name: "Cursor",
        icon: "cursor",
        description: "One-click install Strap into Cursor, then authorize.",
        connectHint:
          "Use the one-click button to add Strap to Cursor as a remote MCP server, then authorize Strap in the browser window Cursor opens.",
      },
      {
        id: "devin",
        name: "Devin",
        icon: "devin",
        description: "Add Strap to Devin from the MCP Marketplace.",
        connectHint:
          "In Devin, open Settings > Connections > MCP servers, add a custom MCP with the URL above then transport HTTP and OAuth.",
      },
      {
        id: "replit",
        name: "Replit",
        icon: "replit",
        description: "Add Strap to Replit as a remote MCP server.",
        connectHint:
          "In Replit, open the Agent's Integrations pane, add a custom MCP server with the URL above, and authorize Strap with OAuth.",
      },
      {
        id: "whirl",
        name: "Whirl",
        icon: "whirl",
        description: "Add Strap to Whirl as a custom MCP connection.",
        connectHint:
          "In Whirl, open Settings and add a custom MCP server with the URL above, then authorize Strap with OAuth.",
      },
      {
        id: "factory",
        name: "Factory",
        icon: "factory",
        description: "Add Strap to Factory's droid as a remote MCP server.",
        connectHint:
          "Run the command below, then /mcp inside droid to authorize in the browser.",
      },
      {
        id: "v0",
        name: "v0",
        icon: "v0",
        description: "Add Strap to v0 as a custom MCP connection.",
        connectHint:
          "In v0, open MCP Connections (or Add MCP in the prompt bar), add a custom server with the URL above, and choose OAuth.",
      },
      {
        id: "custom",
        name: "Custom Agent",
        icon: "custom",
        description:
          "Any client that speaks MCP can connect with the URL above. For non-MCP clients, the HTTP API is documented in the docs.",
        connectHint: remoteHint,
      },
    ] as Array<Omit<ConnectionItem, "status" | "lastUsed">>,
  };
}

function serializeSectionPayload(section: StrapSection) {
  return {
    content: section.content,
    template: section.template,
    agentWritable: section.agentWritable,
    agentPermission: section.agentPermission,
  };
}

function hydrateSection(row: SectionRow): StrapSection {
  const id = normalizeLegacySectionId(row.section_id);
  const payloadTemplate =
    typeof row.payload.template === "string"
      ? (row.payload.template as SectionTemplate)
      : undefined;
  // Read the per-section permission from the dedicated column (the legacy
  // payload `agentWritable` flag is ignored - the old GitHub-pull bug that set
  // it false is moot now). Anything outside the enum heals to "propose", the
  // safe writable default, so no section silently becomes read-only / hidden.
  const agentPermission = normalizeAgentPermission(row.agent_permission);
  const content = legacyPayloadToRichTextContent(row.kind, row.payload);

  return {
    id,
    kind: "rich-text",
    template: inferSectionTemplate(row.kind, payloadTemplate),
    name: row.section_id === "conventions" ? "Operating Principles" : row.name,
    accent: normalizeLegacyAccent(row.accent),
    content,
    agentWritable: permissionToWritable(agentPermission),
    agentPermission,
    lastEditedBy: row.last_edited_by,
    lastEditedType: row.last_edited_type,
    lastEditedLabel: toRelativeTime(row.last_edited_at) ?? "just now",
    archived: row.archived_at != null,
  };
}

function hydrateProposal(row: ProposalRow): Proposal {
  return {
    id: row.id,
    sectionId: normalizeLegacySectionId(row.section_id),
    sectionName:
      row.section_id === "conventions"
        ? "Operating Principles"
        : row.section_name,
    accent: normalizeLegacyAccent(row.accent),
    agentName: row.agent_name,
    createdAt: row.created_at,
    timeLabel: toRelativeTime(row.created_at) ?? "just now",
    changeType: row.change_type,
    reason: row.reason,
    impact: row.impact,
    confidence: row.confidence,
    draft: normalizeLegacyProposalDraft(row.draft),
    status: row.status,
    baseRevision: row.base_revision,
  };
}

// Pending activity rows used to be persisted with `before_text = null`,
// which made the sidebar diff render only the proposed text as "added"
// with nothing on the removed side. We now snapshot the section content at
// proposal-creation time, but for any historic rows still missing it we
// fall back to the section's CURRENT content here - for a pending entry
// that's still the right "before" reference because the proposal hasn't
// been applied yet.
function hydrateActivityEntries(
  rows: ActivityRow[],
  sectionRows: SectionRow[],
): ActivityEntry[] {
  const sectionContentById = new Map<string, string>();
  for (const row of sectionRows) {
    const section = hydrateSection(row);
    sectionContentById.set(section.id, section.content);
  }

  return rows.map((row) => {
    const entry = hydrateActivity(row);
    if (entry.status === "pending" && !entry.beforeText) {
      const fallback = sectionContentById.get(entry.sectionId);
      if (fallback) {
        entry.beforeText = fallback;
      }
    }
    return entry;
  });
}

function hydrateActivity(row: ActivityRow): ActivityEntry {
  const status: ActivityStatus =
    row.status === "accepted" &&
    row.reason === "Applied directly because approval was off."
      ? "direct"
      : row.status;

  return {
    id: row.id,
    proposalId: row.proposal_id ?? undefined,
    createdAt: row.created_at,
    dayLabel: toDayLabel(row.created_at),
    sectionId: normalizeLegacySectionId(row.section_id),
    sectionName:
      row.section_id === "conventions"
        ? "Operating Principles"
        : row.section_name,
    accent: normalizeLegacyAccent(row.accent),
    actor: row.actor,
    actorType: row.actor_type,
    summary: row.summary,
    timeLabel: toRelativeTime(row.created_at) ?? "just now",
    status,
    changeType: row.change_type,
    reason: row.reason,
    impact: row.impact,
    confidence: row.confidence,
    beforeText: row.before_text ?? undefined,
    afterText: row.after_text ?? "",
  };
}

function isNoopActivityEntry(entry: ActivityEntry) {
  if (entry.status === "pending") return false;

  const before = entry.beforeText ?? "";
  const after = entry.afterText ?? "";
  const hasBefore = before.trim().length > 0;
  const hasAfter = after.trim().length > 0;

  if (
    (entry.status === "direct" || entry.status === "accepted") &&
    !hasBefore &&
    !hasAfter
  ) {
    return true;
  }

  return (
    entry.status === "direct" &&
    hasBefore &&
    hasAfter &&
    before !== after &&
    richTextContentEquivalent(before, after)
  );
}

async function ensureTokenRow(client: DatabaseContext, userId: string) {
  const db = client;
  const data = await readTokenRow(db, userId);

  if (data) {
    // Trigger upgrade when the row is legacy (any hash / ciphertext
    // column missing) OR when a resolved token is empty - the latter
    // means `resolveSecret` couldn't decrypt the stored ciphertext,
    // typically because `CREED_ENCRYPTION_SECRET` was rotated. Either
    // way, regenerate fresh tokens with the current key.
    if (
      !data.read_token ||
      !data.proposal_token ||
      !data.direct_edit_token ||
      !data.read_token_hash ||
      !data.proposal_token_hash ||
      !data.direct_edit_token_hash ||
      !data.encrypted_read_token ||
      !data.encrypted_proposal_token ||
      !data.encrypted_direct_edit_token
    ) {
      const read = tokenFields(data.read_token || generateToken("xt_read"));
      const proposal = tokenFields(
        data.proposal_token || generateToken("xt_proposal"),
      );
      const directEdit = tokenFields(
        data.direct_edit_token || generateToken("xt_direct"),
      );
      const { data: upgradedRow, error: upgradeError } = await query(db, tables.creed_tokens, "update", async (database, scope) => {
    const values = {
          // Mirror the encrypted blob into the legacy plaintext columns so
          // we satisfy any lingering NOT NULL / UNIQUE constraints in
          // databases that haven't applied 20260502130000. The blob is
          // ciphertext, never decoded - `resolveSecret` only reads
          // `encrypted_*`, so nothing readable lives in this slot.
          read_token: read.encrypted,
          proposal_token: proposal.encrypted,
          direct_edit_token: directEdit.encrypted,
          read_token_hash: read.hash,
          proposal_token_hash: proposal.hash,
          direct_edit_token_hash: directEdit.hash,
          encrypted_read_token: read.encrypted,
          encrypted_proposal_token: proposal.encrypted,
          encrypted_direct_edit_token: directEdit.encrypted,
          updated_at: new Date().toISOString(),
        } as Partial<typeof tables.creed_tokens.$inferInsert>;
    await authorizeValues(db, tables.creed_tokens, "update", values);
    return database.update(tables.creed_tokens).set(values).where(and(scope, eq(tables.creed_tokens.user_id, userId))).returning();
  }).then(exactlyOne);

      assertNoError(upgradeError, "Could not upgrade Strap tokens.");
      return resolveTokenRow(upgradedRow as TokenRow);
    }

    return data;
  }

  const now = new Date().toISOString();
  const read = tokenFields(generateToken("xt_read"));
  const proposal = tokenFields(generateToken("xt_proposal"));
  const directEdit = tokenFields(generateToken("xt_direct"));
  const nextRow: TokenRow = {
    user_id: userId,
    // Mirror the encrypted blob into the legacy plaintext columns for
    // backwards-compat with schemas that haven't dropped the NOT NULL.
    // resolveSecret reads only encrypted_*, so this slot holds ciphertext
    // and is never decoded - no security regression vs writing null.
    read_token: read.encrypted,
    proposal_token: proposal.encrypted,
    direct_edit_token: directEdit.encrypted,
    read_token_hash: read.hash,
    proposal_token_hash: proposal.hash,
    direct_edit_token_hash: directEdit.hash,
    encrypted_read_token: read.encrypted,
    encrypted_proposal_token: proposal.encrypted,
    encrypted_direct_edit_token: directEdit.encrypted,
    require_approval: true,
    created_at: now,
    updated_at: now,
  };

  const { error: upsertError } = await query(db, tables.creed_tokens, "insert", async (database, _scope) => {
    const values = nextRow as typeof tables.creed_tokens.$inferInsert;
    await authorizeValues(db, tables.creed_tokens, "insert", values);
    return database.insert(tables.creed_tokens).values(values).onConflictDoNothing({ target: [tables.creed_tokens.user_id] });
  });

  assertNoError(upsertError, "Could not create Strap tokens.");

  for (const delayMs of [0, 30]) {
    if (delayMs > 0) {
      await wait(delayMs);
    }

    const existingAfterWrite = await readTokenRow(db, userId);
    if (existingAfterWrite) {
      return existingAfterWrite;
    }
  }

  try {
    const admin = serviceContext("lib/strap-backend.ts");
    const adminExisting = await readTokenRow(admin, userId);
    if (adminExisting) {
      return adminExisting;
    }

    const adminRow: TokenRow = {
      ...nextRow,
      updated_at: new Date().toISOString(),
    };
    const { data: createdRow, error: adminError } = await query(admin, tables.creed_tokens, "insert", async (database, scope) => {
    const values = adminRow as typeof tables.creed_tokens.$inferInsert;
    await authorizeValues(admin, tables.creed_tokens, "insert", values);
    return database.insert(tables.creed_tokens).values(values).onConflictDoUpdate({ target: [tables.creed_tokens.user_id], set: conflictSet(tables.creed_tokens, values), setWhere: scope }).returning();
  }).then(exactlyOne);

    assertNoError(
      adminError,
      "Could not create Strap tokens with admin client.",
    );
    return createdRow as TokenRow;
  } catch (error) {
    if (
      error instanceof Error &&
      /Database is not configured/i.test(error.message)
    ) {
      throw new Error("Could not load Strap tokens after creation.");
    }

    throw error;
  }
}

// Derives the overall "connected via MCP" status from the per-agent roster.
// With OAuth there is no separate credential row to read; the roster is the
// source of truth, and it is ordered most-recent-first.
function deriveMcpStatus(mcpClients: McpClient[]): {
  mcpStatus: StrapState["mcpStatus"];
  mcpLastUsed?: string;
  mcpLastClientName?: string;
} {
  if (mcpClients.length === 0) {
    return { mcpStatus: "waiting" };
  }
  return {
    mcpStatus: "connected",
    mcpLastUsed: mcpClients[0]?.lastUsed,
    mcpLastClientName: mcpClients[0]?.name,
  };
}

export function createBlankCreedState(
  user: User,
  tokenRow?: Pick<
    TokenRow,
    "read_token" | "proposal_token" | "direct_edit_token" | "require_approval"
  >,
  mcpClients: McpClient[] = [],
  githubIntegration?: IntegrationRow | null,
  versionControl?: VersionControlRow | null,
  options?: { ignoreLinkedGitHubIdentity?: boolean },
): StrapState {
  const name = getUserName(user);
  const avatarInitials = getAvatarInitials(name);
  const avatarUrl = getAvatarUrl(user);
  const readToken = tokenRow?.read_token ?? "";
  const proposalToken = tokenRow?.proposal_token ?? "";
  const directEditToken = tokenRow?.direct_edit_token ?? "";
  const { definitions } = buildConnectionDefinitions();

  return {
    ...initialStrapState,
    user: {
      name,
      handle: user.email ? `@${user.email.split("@")[0]}` : "@you",
      avatarInitials,
      avatarUrl,
      email: user.email ?? "",
    },
    readUrl: buildReadUrl(),
    readToken,
    writeToken: proposalToken,
    directEditToken,
    mcpUrl: buildMcpUrl(),
    ...deriveMcpStatus(mcpClients),
    mcpClients,
    sections: [],
    proposals: [],
    activity: [],
    settings: {
      requireApproval: tokenRow?.require_approval ?? true,
      integrations: buildIntegrationSettings(user, githubIntegration, {
        ignoreLinkedIdentity: options?.ignoreLinkedGitHubIdentity ?? false,
      }),
      versionControl: buildVersionControlSettings(versionControl),
    },
    connections: definitions.map((connection) => ({
      ...connection,
      status: "not-connected",
      lastUsed: undefined,
    })),
    onboarding: initialOnboardingState,
    sectionRevisions: {},
  };
}

/**
 * Cheap "has this user been through onboarding?" probe used by
 * `app/page.tsx` and the (strap-app) layout to decide between `/file`
 * (already onboarded) and `/onboarding` (fresh user).
 *
 * The signal is the personal `creeds` row itself: the only thing that
 * creates one is the onboarding claim step (`/api/app/claim` via
 * `ensurePersonalCreedId`). Deliberately NOT a section-count probe - a
 * user who deletes or archives every section still has a Strap and must
 * not be bounced back into first-run onboarding.
 */
export async function hasPersistedCreed(
  client: DatabaseContext,
  userId: string,
): Promise<boolean> {
  const db = client;
  const creedId = await getPersonalStrapId(db, userId);
  return creedId !== null;
}

export const loadCreedState = cache(
  async (
    client: DatabaseContext,
    user: User,
    options?: { proposalLimit?: number; activityLimit?: number },
  ): Promise<PersistResult> => {
    return loadCreedStateImpl(client, user, options);
  },
);

async function loadCreedStateImpl(
  client: DatabaseContext,
  user: User,
  options?: { proposalLimit?: number; activityLimit?: number },
): Promise<PersistResult> {
  const proposalLimit = options?.proposalLimit ?? 500;
  const activityLimit = options?.activityLimit ?? 500;
  const db = client;
  // These five reads are independent of each other; only readMcpClientRows
  // needs personalCreedId, so run the rest as one wave instead of a serial
  // chain (was ~5 sequential round-trips, now 2).
  const [resolvedUser, tokenRow, personalCreedId, githubIntegration, versionControl] =
    await Promise.all([
      enrichUserForState(user),
      ensureTokenRow(db, user.id),
      getPersonalStrapId(db, user.id),
      readGithubIntegrationRow(db, user.id),
      readVersionControlRow(db, user.id),
    ]);
  const mcpClients = await readMcpClientRows(db, user.id, personalCreedId);

  if (!personalCreedId) {
    return {
      state: createBlankCreedState(
        resolvedUser,
        tokenRow,
        mcpClients,
        githubIntegration,
        versionControl,
        { ignoreLinkedGitHubIdentity: true },
      ),
      hasPersistedCreed: false,
    };
  }

  const [
    { data: sectionRows, error: sectionError },
    { data: proposalRows, error: proposalError },
    { data: activityRows, error: activityError },
    { data: connectionRows, error: connectionError },
  ] = await Promise.all([
    query(db, tables.creed_sections, "select", (database, scope) => database.select().from(tables.creed_sections).where(and(scope, eq(tables.creed_sections.creed_id, personalCreedId))).orderBy(asc(tables.creed_sections.position))),
    query(db, tables.creed_proposals, "select", (database, scope) => database.select().from(tables.creed_proposals).where(and(scope, eq(tables.creed_proposals.creed_id, personalCreedId))).orderBy(desc(tables.creed_proposals.created_at)).limit(proposalLimit)),
    query(db, tables.creed_activity, "select", (database, scope) => database.select().from(tables.creed_activity).where(and(scope, eq(tables.creed_activity.creed_id, personalCreedId))).orderBy(desc(tables.creed_activity.created_at)).limit(activityLimit)),
    query(db, tables.creed_connections, "select", (database, scope) => database.select().from(tables.creed_connections).where(and(scope, eq(tables.creed_connections.creed_id, personalCreedId))).orderBy(desc(tables.creed_connections.updated_at))),
  ]);

  assertNoError(sectionError, "Could not load Strap sections.");
  assertNoError(proposalError, "Could not load Strap proposals.");
  assertNoError(activityError, "Could not load Strap activity.");
  assertNoError(connectionError, "Could not load Strap connections.");

  // No early return when the section list is empty: a creed row with zero
  // sections is a real, onboarded Strap whose sections were all deleted or
  // archived. It must load (and keep persisting) as an empty file, not fall
  // back to the blank pre-onboarding state - that disabled autosave and let
  // the routing gates bounce the user back into first-run onboarding.
  const readToken = tokenRow.read_token ?? "";
  const proposalToken = tokenRow.proposal_token ?? "";
  const directEditToken = tokenRow.direct_edit_token ?? "";
  const { definitions } = buildConnectionDefinitions();

  const connectionMap = new Map(
    ((connectionRows as ConnectionRow[] | null) ?? []).map((row) => [
      row.connection_id,
      row,
    ]),
  );

  const baseState = createBlankCreedState(
    resolvedUser,
    tokenRow,
    mcpClients,
    githubIntegration,
    versionControl,
    { ignoreLinkedGitHubIdentity: true },
  );

  // The relative "Saved Xm ago" label starts from the most recent section
  // edit, so a fresh page load reflects when the file actually last changed
  // rather than always reading "just now".
  const editTimes = ((sectionRows as SectionRow[] | null) ?? [])
    .map((row) => Date.parse(row.last_edited_at ?? row.updated_at))
    .filter((ts) => !Number.isNaN(ts));
  const lastSavedAt = editTimes.length ? Math.max(...editTimes) : null;

  return {
    state: {
      ...baseState,
      lastSavedAt,
      readUrl: buildReadUrl(),
      readToken,
      writeToken: proposalToken,
      directEditToken,
      mcpUrl: buildMcpUrl(),
      ...deriveMcpStatus(mcpClients),
      mcpClients,
      sections: ((sectionRows as SectionRow[] | null) ?? []).map(
        hydrateSection,
      ),
      proposals: ((proposalRows as ProposalRow[] | null) ?? []).map(
        hydrateProposal,
      ),
      activity: hydrateActivityEntries(
        (activityRows as ActivityRow[] | null) ?? [],
        (sectionRows as SectionRow[] | null) ?? [],
      ).filter((entry) => !isNoopActivityEntry(entry)),
      settings: {
        requireApproval: tokenRow.require_approval,
        integrations: buildIntegrationSettings(
          resolvedUser,
          githubIntegration,
          {
            ignoreLinkedIdentity: true,
          },
        ),
        versionControl: buildVersionControlSettings(versionControl),
      },
      connections: definitions.map((definition) => {
        const row = connectionMap.get(definition.id);

        return {
          ...definition,
          status: row?.status ?? "not-connected",
          lastUsed: toRelativeTime(row?.last_seen_at) ?? undefined,
        };
      }),
      sectionRevisions: Object.fromEntries(
        ((sectionRows as SectionRow[] | null) ?? []).map((row) => [
          normalizeLegacySectionId(row.section_id),
          row.revision,
        ]),
      ),
    },
    hasPersistedCreed: true,
  };
}

// ── Company / active-Strap loading ──────────────────────────────────────────

// The entry point the UI uses to load "the Strap the user is currently in".
// Personal Straps go through the untouched loadStrapState (byte-identical
// behaviour); company Creeds go through loadCompanyCreedState (admin client,
// membership + permission filtered). The switcher list is attached to both.
// `active` comes from resolveActiveCreed (cookie + membership validated); pass
// null for a brand-new user with no Strap yet.
export async function loadActiveCreedState(
  client: DatabaseContext,
  user: User,
  active: {
    creedId: string;
    role: StrapRole;
    creeds: StrapSummary[];
  } | null,
): Promise<PersistResult> {
  const resolvedUser = await enrichUserForState(user);
  const creeds = enrichCreedSwitcherItems(active?.creeds ?? [], resolvedUser);
  const activeEntry = active
    ? (creeds.find((c) => c.id === active.creedId) ?? null)
    : null;

  if (active && activeEntry && activeEntry.type === "company") {
    return loadCompanyCreedState(
      resolvedUser,
      active.creedId,
      active.role,
      creeds,
    );
  }

  const result = await loadCreedState(client, resolvedUser);
  const personalId = creeds.find((c) => c.type === "personal")?.id;
  return {
    ...result,
    state: {
      ...result.state,
      creeds,
      creedId: personalId ?? result.state.creedId,
      creedType: "personal",
    },
  };
}

// Load a Company Strap's state via the service-role admin client, after the
// caller has validated membership (role passed in). Reads are filtered to what
// the member may see: Hidden sections (and their proposals/activity) are removed
// entirely. hasPersistedCreed is returned false so the personal full-state PUT
// autosave never fires in company mode - company writes go through the
// per-section API instead.
export async function loadCompanyCreedState(
  user: User,
  creedId: string,
  role: StrapRole,
  creeds: StrapSwitcherItem[],
): Promise<PersistResult> {
  const admin = viewerContext(getDatabase(), { userId: user.id });
  const verifiedRole = await getStrapRole(admin, user.id, creedId);
  if (!verifiedRole) throw new AccessDeniedError();
  role = verifiedRole;
  const authAdmin = serviceContext("lib/strap-backend.ts");
  const resolvedUser = await enrichUserForState(user);

  const creedWithAvatar = (await query(admin, tables.creeds, "select", (database, scope) => database.select({ name: tables.creeds.name, company_email: tables.creeds.company_email, avatar_url: tables.creeds.avatar_url }).from(tables.creeds).where(and(scope, eq(tables.creeds.id, creedId)))).then(maybeOne)) as {
    data: {
      name?: string;
      company_email?: string | null;
      avatar_url?: string | null;
    } | null;
    error: unknown;
  };
  const creedResult = creedWithAvatar.error
    ? ((await query(admin, tables.creeds, "select", (database, scope) => database.select({ name: tables.creeds.name, company_email: tables.creeds.company_email }).from(tables.creeds).where(and(scope, eq(tables.creeds.id, creedId)))).then(maybeOne)) as {
        data: { name?: string; company_email?: string | null } | null;
        error: unknown;
      })
    : creedWithAvatar;

  const [
    sectionsResult,
    proposalsResult,
    activityResult,
    membersResult,
    overridesResult,
    invitesResult,
    connectionsResult,
    mcpClientRows,
    agentPermissionsResult,
    companyGithubIntegration,
    companyVersionControlResult,
  ] = await Promise.all([
    query(admin, tables.creed_sections, "select", (database, scope) => database.select().from(tables.creed_sections).where(and(scope, eq(tables.creed_sections.creed_id, creedId), isNull(tables.creed_sections.deleted_at))).orderBy(asc(tables.creed_sections.position))),
    query(admin, tables.creed_proposals, "select", (database, scope) => database.select().from(tables.creed_proposals).where(and(scope, eq(tables.creed_proposals.creed_id, creedId))).orderBy(desc(tables.creed_proposals.created_at)).limit(500)),
    query(admin, tables.creed_activity, "select", (database, scope) => database.select().from(tables.creed_activity).where(and(scope, eq(tables.creed_activity.creed_id, creedId))).orderBy(desc(tables.creed_activity.created_at)).limit(500)),
    query(admin, tables.creed_members, "select", (database, scope) => database.select({ user_id: tables.creed_members.user_id, role: tables.creed_members.role }).from(tables.creed_members).where(and(scope, eq(tables.creed_members.creed_id, creedId)))),
    query(admin, tables.creed_member_section_permissions, "select", (database, scope) => database.select({ section_id: tables.creed_member_section_permissions.section_id, permission: tables.creed_member_section_permissions.permission }).from(tables.creed_member_section_permissions).where(and(scope, eq(tables.creed_member_section_permissions.creed_id, creedId), eq(tables.creed_member_section_permissions.user_id, user.id)))),
    query(admin, tables.creed_invites, "select", (database, scope) => database.select({ id: tables.creed_invites.id, email: tables.creed_invites.email, role: tables.creed_invites.role }).from(tables.creed_invites).where(and(scope, eq(tables.creed_invites.creed_id, creedId), eq(tables.creed_invites.status, "pending"))).orderBy(asc(tables.creed_invites.created_at))),
    query(admin, tables.creed_connections, "select", (database, scope) => database.select().from(tables.creed_connections).where(and(scope, eq(tables.creed_connections.creed_id, creedId))).orderBy(desc(tables.creed_connections.updated_at))),
    query(admin, tables.creed_mcp_clients, "select", (database, scope) => database.select().from(tables.creed_mcp_clients).where(and(scope, eq(tables.creed_mcp_clients.creed_id, creedId))).orderBy(desc(tables.creed_mcp_clients.last_seen_at))),
    // The member's OWN per-section agent ceiling for this Company Strap (the
    // company twin of personal agent_permission; no row = 'propose').
    query(admin, tables.creed_member_agent_permissions, "select", (database, scope) => database.select({ section_id: tables.creed_member_agent_permissions.section_id, permission: tables.creed_member_agent_permissions.permission }).from(tables.creed_member_agent_permissions).where(and(scope, eq(tables.creed_member_agent_permissions.creed_id, creedId), eq(tables.creed_member_agent_permissions.user_id, user.id)))),
    // The TEAM's GitHub connection (manager-only): a single team-wide token,
    // separate from any member's personal GitHub. Members never see it.
    role === "owner" || role === "admin"
      ? readCompanyGitHubIntegration(creedId).catch(() => null)
      : Promise.resolve(null),
    companyVersionControl(admin.database, { userId: user.id }, creedId).then(data => ({ data, error: null })),
  ]);

  const creedRow = creedResult.data as {
    name?: string;
    company_email?: string | null;
    avatar_url?: string | null;
  } | null;
  const creedName = creedRow?.name ?? "Company";
  const companyEmail = creedRow?.company_email ?? undefined;
  const companyAvatarUrl = creedRow?.avatar_url ?? undefined;
  const allSectionRows = (sectionsResult.data as SectionRow[] | null) ?? [];
  const memberRows =
    (membersResult.data as Array<{
      user_id: string;
      role: StrapRole;
    }> | null) ?? [];
  const overrideRows =
    (overridesResult.data as Array<{
      section_id: string;
      permission: AgentPermission;
    }> | null) ?? [];
  const inviteRows =
    (invitesResult.data as Array<{
      id: string;
      email: string;
      role: "admin" | "member";
    }> | null) ?? [];

  const overrides = new Map<string, AgentPermission>(
    overrideRows.map((row) => [
      normalizeLegacySectionId(row.section_id),
      row.permission,
    ]),
  );

  // Filter sections to what this member may see; build the effective-permission
  // map. Owner/admin resolve to "direct" on everything (see all).
  const visibleSectionRows: SectionRow[] = [];
  const myPermissions: Record<string, AgentPermission> = {};
  for (const row of allSectionRows) {
    const id = normalizeLegacySectionId(row.section_id);
    const effective = resolveSectionPermission(role, overrides.get(id));
    if (effective === "hidden") continue;
    visibleSectionRows.push(row);
    myPermissions[id] = effective;
  }
  const visibleIds = new Set(
    visibleSectionRows.map((row) => normalizeLegacySectionId(row.section_id)),
  );

  // Roster with display names + real profile pictures (per-member auth lookup;
  // rosters are small). Built before proposals so a manual (human) proposal can
  // borrow its author's avatar.
  const members: StrapMemberSummary[] = await Promise.all(
    memberRows.map(async (row) => {
      const { data } = await findUser(authAdmin, row.user_id)
        .catch(() => ({ data: { user: null } }));
      const memberUser = data.user;
      const name = memberUser ? getUserName(memberUser) : "Member";
      return {
        userId: row.user_id,
        name,
        email: memberUser?.email ?? "",
        avatarInitials: getAvatarInitials(name),
        avatarUrl: memberUser ? getAvatarUrl(memberUser) : undefined,
        role: row.role,
      };
    }),
  );
  const memberById = new Map(members.map((m) => [m.userId, m]));

  const proposals = ((proposalsResult.data as ProposalRow[] | null) ?? [])
    .map((row) => {
      const base = hydrateProposal(row);
      // author_user_id is set only for a member's manual edit; agent proposals
      // leave it null. Tag human proposals so the UI shows the person's avatar,
      // and mark the viewer's own so they get edit/delete instead of approve.
      const authorId = row.author_user_id ?? null;
      if (!authorId) return base;
      const member = memberById.get(authorId);
      return {
        ...base,
        authorType: "user" as const,
        authorAvatarUrl: member?.avatarUrl,
        authorInitials:
          member?.avatarInitials ?? getAvatarInitials(base.agentName),
        mine: authorId === user.id,
      };
    })
    .filter(
      (p) => visibleIds.has(p.sectionId) || p.sectionId === "new-section",
    );
  // The sidebar is for content: edits, proposals, section lifecycle. Admin /
  // config events (access changes, role changes, membership, billing/BYOK) are
  // audit-log-only, so drop them here.
  const HIDDEN_ACTIVITY_KINDS = new Set([
    "permission",
    "role",
    "membership",
    "byok",
    "billing",
  ]);
  const activityRows = (
    (activityResult.data as ActivityRow[] | null) ?? []
  ).filter((row) => !HIDDEN_ACTIVITY_KINDS.has(row.event_kind ?? ""));
  const activity = hydrateActivityEntries(activityRows, visibleSectionRows)
    .map((entry, index) => {
      // A person's activity borrows their profile picture from the roster; an
      // agent keeps its glyph (resolved from the name in the UI).
      if (entry.actorType !== "user") return entry;
      const member = memberById.get(activityRows[index]?.actor_user_id ?? "");
      return {
        ...entry,
        avatarUrl: member?.avatarUrl,
        avatarInitials:
          member?.avatarInitials ?? getAvatarInitials(entry.actor),
      };
    })
    .filter((entry) => !entry.sectionId || visibleIds.has(entry.sectionId))
    .filter((entry) => !isNoopActivityEntry(entry));

  const company: CompanyContext = {
    creedId,
    creedName,
    avatarUrl: companyAvatarUrl,
    companyEmail,
    myRole: role,
    members,
    myPermissions,
    // Whether the shared "Creed" GitHub OAuth App is configured on this
    // deployment. Managers only need it to decide whether to offer "Connect".
    githubOAuthConfigured: isGitHubOAuthAppConfigured(),
    // Pending invites are a management view (owner/admin): each can be revoked.
    invites:
      role === "owner" || role === "admin"
        ? inviteRows.map((invite) => ({
            id: invite.id,
            email: invite.email,
            role: invite.role,
          }))
        : undefined,
  };

  const mcpClients = ((mcpClientRows.data as McpClientRow[] | null) ?? []).map(
    hydrateMcpClient,
  );
  const { definitions } = buildConnectionDefinitions();
  const connectionMap = new Map(
    ((connectionsResult.data as ConnectionRow[] | null) ?? []).map((row) => [
      row.connection_id,
      row,
    ]),
  );

  const editTimes = visibleSectionRows
    .map((row) => Date.parse(row.last_edited_at ?? row.updated_at))
    .filter((ts) => !Number.isNaN(ts));

  // The member's own agent ceilings, laid over the hydrated sections so the
  // settings Agent-edit-behaviour UI and MCP read the SAME per-member value.
  // The shared creed_sections.agent_permission column is meaningless for a
  // company file (it cannot vary per member), so it is ignored here.
  const agentPermissionRows =
    (agentPermissionsResult.data as Array<{
      section_id: string;
      permission: AgentPermission;
    }> | null) ?? [];
  const myAgentPermissions = new Map<string, AgentPermission>(
    agentPermissionRows.map((row) => [
      normalizeLegacySectionId(row.section_id),
      row.permission,
    ]),
  );

  // Version control targets the company file but is a manager tool: only
  // owner/admin see the config (and the file-screen push affordances it
  // enables); members get the blank not-configured shape.
  const companyVersionControlRow =
    role === "owner" || role === "admin"
      ? ((companyVersionControlResult.data as VersionControlRow | null) ?? null)
      : null;

  // The team GitHub connection status feeds settings.integrations.github so the
  // file-screen push affordances + the company Settings screen read one source.
  // It is the TEAM's connection, not the manager's personal one, so we ignore
  // the caller's linked GitHub identity when deriving status (createBlankCreedState
  // option below). Only provider_login + status are read downstream.
  const githubRowForState: IntegrationRow | null = companyGithubIntegration
    ? ({
        user_id: user.id,
        provider: "github",
        status: companyGithubIntegration.status,
        provider_account_id: companyGithubIntegration.providerAccountId,
        provider_login: companyGithubIntegration.providerLogin,
        access_token: null,
        refresh_token: null,
        encrypted_access_token: null,
        encrypted_refresh_token: null,
        token_expires_at: null,
        created_at: "",
        updated_at: "",
      } satisfies IntegrationRow)
    : null;

  const base = createBlankCreedState(
    resolvedUser,
    undefined,
    [],
    githubRowForState,
    companyVersionControlRow,
    { ignoreLinkedGitHubIdentity: true },
  );
  return {
    state: {
      ...base,
      creedId,
      creedType: "company",
      creeds,
      company,
      lastSavedAt: editTimes.length ? Math.max(...editTimes) : null,
      // Company uses OAuth MCP; the legacy bearer tokens are personal-only.
      readUrl: "",
      readToken: "",
      writeToken: "",
      directEditToken: "",
      mcpUrl: buildMcpUrl(),
      ...deriveMcpStatus(mcpClients),
      mcpClients,
      sections: visibleSectionRows.map(hydrateSection).map((section) => {
        const agentPermission = myAgentPermissions.get(section.id) ?? "propose";
        return {
          ...section,
          agentPermission,
          agentWritable: agentPermission === "direct",
        };
      }),
      proposals,
      activity,
      connections: definitions.map((definition) => {
        const row = connectionMap.get(definition.id);
        return {
          ...definition,
          status: row?.status ?? "not-connected",
          lastUsed: toRelativeTime(row?.last_seen_at) ?? undefined,
        };
      }),
      sectionRevisions: Object.fromEntries(
        visibleSectionRows.map((row) => [
          normalizeLegacySectionId(row.section_id),
          row.revision,
        ]),
      ),
    },
    hasPersistedCreed: false,
  };
}

export async function persistCreedState(
  client: DatabaseContext,
  userId: string,
  state: StrapState,
) {
  const db = client;
  const creedId = await getPersonalStrapId(db, userId);
  if (!creedId) {
    throw new Error("Could not resolve the personal Strap.");
  }
  const [currentSectionsResult, existingProposalsResult] = await Promise.all([
    query(db, tables.creed_sections, "select", (database, scope) => database.select({ section_id: tables.creed_sections.section_id, kind: tables.creed_sections.kind, name: tables.creed_sections.name, accent: tables.creed_sections.accent, payload: tables.creed_sections.payload, revision: tables.creed_sections.revision, last_edited_at: tables.creed_sections.last_edited_at, archived_at: tables.creed_sections.archived_at }).from(tables.creed_sections).where(and(scope, eq(tables.creed_sections.creed_id, creedId)))),
    query(db, tables.creed_proposals, "select", (database, scope) => database.select({ id: tables.creed_proposals.id }).from(tables.creed_proposals).where(and(scope, eq(tables.creed_proposals.creed_id, creedId)))),
  ]);

  assertNoError(
    currentSectionsResult.error,
    "Could not load current section revisions.",
  );
  assertNoError(
    existingProposalsResult.error,
    "Could not load current proposals.",
  );

  const currentSectionRows =
    (currentSectionsResult.data as Array<{
      section_id: string;
      kind: StrapSection["kind"];
      name: string;
      accent: AccentKey;
      payload: Record<string, unknown>;
      revision: number;
      last_edited_at?: string;
      archived_at?: string | null;
    }> | null) ?? [];
  const currentSections = new Map<
    string,
    {
      kind: StrapSection["kind"];
      name: string;
      accent: AccentKey;
      payload: Record<string, unknown>;
      revision: number;
      lastEditedAt?: string;
      archivedAt?: string | null;
    }
  >(
    currentSectionRows.map((row) => [
      normalizeLegacySectionId(row.section_id),
      {
        kind: row.kind,
        name: row.name,
        accent: row.accent,
        payload: row.payload,
        revision: row.revision,
        lastEditedAt: row.last_edited_at,
        archivedAt: row.archived_at,
      },
    ]),
  );
  const existingProposalIds = new Set(
    ((existingProposalsResult.data as Array<{ id: string }> | null) ?? []).map(
      (row) => row.id,
    ),
  );

  const now = new Date().toISOString();
  const sectionRows = state.sections.map((section, index) => {
    const payload = serializeSectionPayload(section);
    const current = currentSections.get(section.id);
    const changed =
      JSON.stringify(current?.payload ?? null) !== JSON.stringify(payload) ||
      current?.kind !== section.kind ||
      current?.name !== section.name ||
      current?.accent !== section.accent;

    return {
      creed_id: creedId,
      user_id: userId,
      section_id: section.id,
      position: index,
      kind: section.kind,
      name: section.name,
      accent: section.accent,
      payload,
      agent_permission: section.agentPermission,
      last_edited_by: section.lastEditedBy,
      last_edited_type: section.lastEditedType,
      last_edited_at: changed ? now : (current?.lastEditedAt ?? now),
      revision: changed
        ? (current?.revision ?? 0) + 1
        : (current?.revision ?? 1),
      // Preserve the original archive time so "archived" ordering is stable;
      // null clears it on restore. Metadata only - does not bump revision.
      archived_at: section.archived ? (current?.archivedAt ?? now) : null,
      created_at: now,
      updated_at: now,
    };
  });

  // Stale proposals are resolved, not persisted: they used to be written back
  // with status "stale" forever (removable only covered accepted/rejected), so
  // every refresh reloaded them and they accumulated. The client now drops
  // them from its list on resolution; this filter is the belt-and-braces.
  const persistableProposals = state.proposals.filter(
    (proposal) => proposal.status !== "stale",
  );
  const proposalRows = persistableProposals.map((proposal) => ({
    id: proposal.id,
    creed_id: creedId,
    user_id: userId,
    section_id: proposal.sectionId,
    section_name: proposal.sectionName,
    accent: proposal.accent,
    agent_name: proposal.agentName,
    change_type: proposal.changeType,
    reason: proposal.reason,
    impact: proposal.impact,
    confidence: proposal.confidence,
    draft: proposal.draft,
    status: proposal.status,
    base_revision: proposal.baseRevision ?? null,
    created_at: proposal.createdAt ?? now,
    updated_at: now,
  }));

  const proposalIds = persistableProposals.map((proposal) => proposal.id);
  const knownProposalIds = new Set(proposalIds);
  const activityRows = state.activity
    .filter((entry) => !isNoopActivityEntry(entry))
    .map((entry) => ({
      id: entry.id,
      creed_id: creedId,
      user_id: userId,
      proposal_id:
        entry.proposalId && knownProposalIds.has(entry.proposalId)
          ? entry.proposalId
          : null,
      section_id: entry.sectionId,
      section_name: entry.sectionName,
      accent: entry.accent,
      actor: entry.actor,
      actor_type: entry.actorType,
      summary: entry.summary,
      status: entry.status,
      change_type: entry.changeType,
      reason: entry.reason,
      impact: entry.impact,
      confidence: entry.confidence,
      before_text: entry.beforeText ?? null,
      after_text: entry.afterText,
      created_at: entry.createdAt ?? now,
    }));

  const sectionIds = state.sections.map((section) => section.id);

  if (sectionRows.length > 0) {
    const { error } = await query(db, tables.creed_sections, "insert", async (database, scope) => {
    const values = sectionRows as typeof tables.creed_sections.$inferInsert[];
    await authorizeValues(db, tables.creed_sections, "insert", values);
    return database.insert(tables.creed_sections).values(values).onConflictDoUpdate({ target: [tables.creed_sections.creed_id, tables.creed_sections.section_id], set: conflictSet(tables.creed_sections, values), setWhere: scope });
  });
    assertNoError(error, "Could not persist Strap sections.");
  }

  if (proposalRows.length > 0) {
    const { error } = await query(db, tables.creed_proposals, "insert", async (database, scope) => {
    const values = proposalRows as typeof tables.creed_proposals.$inferInsert[];
    await authorizeValues(db, tables.creed_proposals, "insert", values);
    return database.insert(tables.creed_proposals).values(values).onConflictDoUpdate({ target: [tables.creed_proposals.id], set: conflictSet(tables.creed_proposals, values), setWhere: scope });
  });
    assertNoError(error, "Could not persist Strap proposals.");
  }

  if (activityRows.length > 0) {
    const { error } = await query(db, tables.creed_activity, "insert", async (database, scope) => {
    const values = activityRows as typeof tables.creed_activity.$inferInsert[];
    await authorizeValues(db, tables.creed_activity, "insert", values);
    return database.insert(tables.creed_activity).values(values).onConflictDoUpdate({ target: [tables.creed_activity.id], set: conflictSet(tables.creed_activity, values), setWhere: scope });
  });
    assertNoError(error, "Could not persist Strap activity.");
  }

  const versionControlRow = {
    user_id: userId,
    provider: "github" as const,
    repo_owner: state.settings.versionControl.repoOwner || null,
    repo_name: state.settings.versionControl.repoName || null,
    branch: state.settings.versionControl.branch || null,
    path: state.settings.versionControl.path,
    last_remote_sha: state.settings.versionControl.lastRemoteSha ?? null,
    last_remote_message:
      state.settings.versionControl.lastRemoteMessage ?? null,
    last_remote_committed_at:
      state.settings.versionControl.lastRemoteCommittedAt ?? null,
    last_synced_content_hash:
      state.settings.versionControl.lastSyncedContentHash ?? null,
    sync_status:
      state.settings.versionControl.repoOwner &&
      state.settings.versionControl.repoName &&
      state.settings.versionControl.branch
        ? state.settings.versionControl.syncStatus
        : "not-configured",
    updated_at: now,
    created_at: now,
  };

  const { error: versionControlError } = await query(db, tables.creed_version_control, "insert", async (database, scope) => {
    const values = versionControlRow as typeof tables.creed_version_control.$inferInsert;
    await authorizeValues(db, tables.creed_version_control, "insert", values);
    return database.insert(tables.creed_version_control).values(values).onConflictDoUpdate({ target: [tables.creed_version_control.user_id], set: conflictSet(tables.creed_version_control, values), setWhere: scope });
  });
  assertNoError(
    versionControlError,
    "Could not persist version control settings.",
  );

  if (sectionIds.length > 0) {
    const removableSectionIds = currentSectionRows
      .map((row) => row.section_id)
      .filter(
        (id) =>
          !sectionIds.includes(normalizeLegacySectionId(id)) ||
          (id === "conventions" && sectionIds.includes("operating-principles")),
      );

    // Only issue the delete when there's something to remove. The previous
    // guard swallowed any error whose message merely contained "in" (which
    // catches "timeout", "connection", "invalid input") to tolerate an empty
    // `.in()` list; skipping the call when the list is empty is the real fix
    // and lets every genuine delete error surface.
    if (removableSectionIds.length > 0) {
      const { error } = await query(db, tables.creed_sections, "delete", (database, scope) => database.delete(tables.creed_sections).where(and(scope, eq(tables.creed_sections.creed_id, creedId), inArray(tables.creed_sections.section_id, removableSectionIds))));
      assertNoError(error, "Could not remove deleted sections.");
    }
  }

  const resolvedProposalIds = new Set(
    state.activity
      .filter(
        (entry) =>
          (entry.status === "accepted" ||
            entry.status === "rejected" ||
            entry.status === "stale") &&
          Boolean(entry.proposalId),
      )
      .map((entry) => entry.proposalId as string),
  );
  const removableProposalIds = Array.from(existingProposalIds).filter(
    (id) => !knownProposalIds.has(id) && resolvedProposalIds.has(id),
  );

  if (removableProposalIds.length > 0) {
    const { error: removeError } = await query(db, tables.creed_proposals, "delete", (database, scope) => database.delete(tables.creed_proposals).where(and(scope, eq(tables.creed_proposals.creed_id, creedId), inArray(tables.creed_proposals.id, removableProposalIds))));
    assertNoError(removeError, "Could not remove resolved proposals.");
  }

  await ensureTokenRow(db, userId);
  const { error: tokenError } = await query(db, tables.creed_tokens, "update", async (database, scope) => {
    const values = {
      require_approval: state.settings.requireApproval,
      updated_at: now,
    } as Partial<typeof tables.creed_tokens.$inferInsert>;
    await authorizeValues(db, tables.creed_tokens, "update", values);
    return database.update(tables.creed_tokens).set(values).where(and(scope, eq(tables.creed_tokens.user_id, userId)));
  });
  assertNoError(tokenError, "Could not persist Strap settings.");
}

export async function recordConnectionUsage(
  client: DatabaseContext,
  userId: string,
  integrationId?: string | null,
  agentName?: string | null,
  observedVia: "read" | "proposal" = "read",
  creedId?: string | null,
) {
  const db = client;
  const targetCreedId = creedId ?? (await getPersonalStrapId(db, userId));
  if (!targetCreedId) {
    throw new Error("Could not resolve Strap for connection usage.");
  }
  const connectionId = normalizeIntegrationId(
    integrationId ?? inferIntegrationId(agentName),
  );
  const now = new Date().toISOString();

  const { error } = await query(db, tables.creed_connections, "insert", async (database, scope) => {
    const values = {
      creed_id: targetCreedId,
      user_id: userId,
      connection_id: connectionId,
      status: "connected",
      last_seen_at: now,
      last_agent_name: agentName ?? null,
      observed_via: observedVia,
      created_at: now,
      updated_at: now,
    } as typeof tables.creed_connections.$inferInsert;
    await authorizeValues(db, tables.creed_connections, "insert", values);
    return database.insert(tables.creed_connections).values(values).onConflictDoUpdate({ target: [tables.creed_connections.creed_id, tables.creed_connections.connection_id], set: conflictSet(tables.creed_connections, values), setWhere: scope });
  });

  assertNoError(error, "Could not record Strap connection usage.");
}

async function findUserIdByTokenHash(db: DatabaseContext, _table: "creed_tokens", hashColumn: "read_token_hash" | "proposal_token_hash" | "direct_edit_token_hash", token: string, errorMessage: string): Promise<string | null> {
  const { data, error } = await query(db, tables.creed_tokens, "select", (database, scope) => database.select({ user_id: tables.creed_tokens.user_id }).from(tables.creed_tokens)
    .where(and(scope, eq(tables.creed_tokens[hashColumn], hashSecret(token))))).then(maybeOne);
  assertNoError(error, errorMessage);
  return data?.user_id ?? null;
}

export async function findUserIdByReadToken(client: DatabaseContext, token: string) {
  return findUserIdByTokenHash(
    client,
    "creed_tokens",
    "read_token_hash",
    token,
    "Could not verify read token.",
  );
}

export async function findUserIdByProposalToken(
  client: DatabaseContext,
  token: string,
) {
  return findUserIdByTokenHash(
    client,
    "creed_tokens",
    "proposal_token_hash",
    token,
    "Could not verify proposal token.",
  );
}

export async function findUserIdByDirectEditToken(
  client: DatabaseContext,
  token: string,
) {
  return findUserIdByTokenHash(
    client,
    "creed_tokens",
    "direct_edit_token_hash",
    token,
    "Could not verify direct edit token.",
  );
}

// Records that an MCP client read the user's Strap: bumps the per-agent roster
// (creed_mcp_clients) and the daily read rollup. The overall "connected / last
// seen" status shown in the UI is derived from this roster, so there is no
// separate credential row to touch.
export async function recordMcpClientUsage(
  client: DatabaseContext,
  userId: string,
  clientName?: string | null,
  creedId?: string | null,
) {
  const db = client;
  const targetCreedId = creedId ?? (await getPersonalStrapId(db, userId));
  if (!targetCreedId) {
    throw new Error("Could not resolve Strap for MCP usage.");
  }
  const now = new Date().toISOString();
  const normalizedClientName = clientName?.trim() || null;
  const hasSpecificClientName =
    normalizedClientName !== null &&
    normalizedClientName.toLowerCase() !== "mcp client";

  if (hasSpecificClientName) {
    const clientId = normalizeMcpClientId(normalizedClientName);
    const { error: clientError } = await query(db, tables.creed_mcp_clients, "insert", async (database, scope) => {
    const values = {
        creed_id: targetCreedId,
        user_id: userId,
        client_id: clientId,
        client_name: normalizedClientName,
        last_seen_at: now,
        // Omit created_at so the column default seeds it on first insert and a
        // later read never resets first-seen (onConflict would overwrite it).
        updated_at: now,
      } as typeof tables.creed_mcp_clients.$inferInsert;
    await authorizeValues(db, tables.creed_mcp_clients, "insert", values);
    return database.insert(tables.creed_mcp_clients).values(values).onConflictDoUpdate({ target: [tables.creed_mcp_clients.creed_id, tables.creed_mcp_clients.client_id], set: conflictSet(tables.creed_mcp_clients, values), setWhere: scope });
  });

    assertNoError(clientError, "Could not record MCP client usage.");

    // Bump the per-agent daily read rollup that powers the MCP health
    // dashboard. Best-effort: a failed counter must never break a read.

    const { error: readEventError } = await callProcedure(db,
      "increment_mcp_read_for_creed",
      {
        p_creed_id: targetCreedId,
        p_reader_user_id: userId,
        p_client_id: clientId,
        p_day: now.slice(0, 10),
      },
    );
    if (readEventError) {
      log.warn("Could not record MCP read event", {
        message: readEventError.message,
      });
    }
  }

  await recordConnectionUsage(
    db,
    userId,
    "mcp",
    hasSpecificClientName ? normalizedClientName : null,
    "read",
    targetCreedId,
  );
}

export async function recordCliAgentUsage(
  client: DatabaseContext,
  userId: string,
  tokenId: string,
  agentIcon: CliAttributableAgentId,
  creedId: string,
) {
  const db = client;
  const now = new Date().toISOString();
  const { error } = await query(db, tables.creed_mcp_clients, "insert", async (database, scope) => {
    const values = {
      creed_id: creedId,
      user_id: userId,
      client_id: `cli-${tokenId}-${agentIcon}`,
      client_name: `Strap CLI via ${agentIcon}`,
      last_seen_at: now,
      updated_at: now,
    } as typeof tables.creed_mcp_clients.$inferInsert;
    await authorizeValues(db, tables.creed_mcp_clients, "insert", values);
    return database.insert(tables.creed_mcp_clients).values(values).onConflictDoUpdate({ target: [tables.creed_mcp_clients.creed_id, tables.creed_mcp_clients.client_id], set: conflictSet(tables.creed_mcp_clients, values), setWhere: scope });
  });
  assertNoError(error, "Could not record CLI agent usage.");
}

export async function buildAgentPayloadForToken(
  client: DatabaseContext,
  token: string,
  integrationId?: string | null,
) {
  const db = client;
  const userId = await findUserIdByReadToken(db, token);
  if (!userId) {
    return null;
  }


  const { data: userData, error: userError } =
    await findUser(db, userId);

  if (userError || !userData?.user) {
    throw new Error(userError?.message || "Could not load token owner.");
  }

  const { state } = await loadCreedState(db, userData.user);
  await recordConnectionUsage(
    db,
    userId,
    integrationId,
    integrationId ?? "Custom Agent",
    "read",
  );

  return {
    userId,
    state,
    payload: buildAgentReadPayload(state, {
      proposalUrl: buildProposalUrl(),
      directEditUrl: buildDirectEditUrl(),
      docsUrl: `${getSiteUrl()}/docs`,
    }),
  };
}

// Strap-native API aliases. Keep the Creed-named exports above for installed
// callers while new internal code migrates to the canonical module vocabulary.
export const createBlankStrapState = createBlankCreedState;
export const hasPersistedStrap = hasPersistedCreed;
export const loadStrapState = loadCreedState;
export const loadActiveStrapState = loadActiveCreedState;
export const loadCompanyStrapState = loadCompanyCreedState;
export const persistStrapState = persistCreedState;
export const buildAgentPayloadForStrapToken = buildAgentPayloadForToken;
