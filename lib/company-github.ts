import * as tables from "@/db/schema/application";
import { authorizeValues } from "@/lib/authz/policies";
import type { DatabaseContext } from "@/lib/db/context";
import { conflictSet, maybeOne, query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import {
  getGitHubOAuthAppCredentials,
  refreshGitHubAccessToken,
} from "@/lib/github";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";
import { and, eq } from "drizzle-orm";
import "server-only";

// The team's GitHub connection (creed_company_github_integration): a single
// team-wide token, authorized by an owner/admin through the dedicated company
// GitHub OAuth App and stored encrypted, keyed by creed_id. This is what company
// pushes / status / repo listing run on - never a member's personal GitHub. The
// shape mirrors the personal creed_integrations helpers so the version-control
// routes can branch on "company vs personal" and otherwise share the same
// GitHub API calls.

type CompanyGitHubRow = {
  creed_id: string;
  status: "connected" | "not-connected" | "disconnected";
  provider_account_id: string | null;
  provider_login: string | null;
  encrypted_access_token: string | null;
  encrypted_refresh_token: string | null;
  token_expires_at: string | null;
};

export type CompanyGitHubIntegration = {
  status: "connected" | "not-connected" | "disconnected";
  providerAccountId: string | null;
  providerLogin: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
};

function admin(): DatabaseContext {
  return serviceContext("lib/company-github.ts");
}

function decryptOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return decryptSecret(value, "company GitHub token");
  } catch {
    // A malformed/undecryptable token is treated as "not connected" rather than
    // throwing, so a key rotation degrades to a reconnect prompt.
    return null;
  }
}

/**
 * The team's GitHub connection with tokens decrypted, or null when the team has
 * never connected. Always read via the admin client after an app-level
 * owner/admin check - the row is service-role only under RLS.
 */
export async function readCompanyGitHubIntegration(
  creedId: string
): Promise<CompanyGitHubIntegration | null> {
  const { data } = (await query(admin(), tables.creed_company_github_integration, "select", (database, scope) => database.select({ creed_id: tables.creed_company_github_integration.creed_id, status: tables.creed_company_github_integration.status, provider_account_id: tables.creed_company_github_integration.provider_account_id, provider_login: tables.creed_company_github_integration.provider_login, encrypted_access_token: tables.creed_company_github_integration.encrypted_access_token, encrypted_refresh_token: tables.creed_company_github_integration.encrypted_refresh_token, token_expires_at: tables.creed_company_github_integration.token_expires_at }).from(tables.creed_company_github_integration).where(and(scope, eq(tables.creed_company_github_integration.creed_id, creedId)))).then(maybeOne)) as { data: CompanyGitHubRow | null };
  if (!data) return null;
  return {
    status: data.status,
    providerAccountId: data.provider_account_id,
    providerLogin: data.provider_login,
    accessToken: decryptOrNull(data.encrypted_access_token),
    refreshToken: decryptOrNull(data.encrypted_refresh_token),
    tokenExpiresAt: data.token_expires_at,
  };
}

/** Store (or replace) the team's GitHub connection. Tokens are encrypted here. */
export async function upsertCompanyGitHubIntegration(params: {
  creedId: string;
  connectedBy: string;
  providerAccountId: string | null;
  providerLogin: string | null;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  await query(admin(), tables.creed_company_github_integration, "insert", async (database, scope) => {
    const values = {
        creed_id: params.creedId,
        provider: "github",
        status: "connected",
        provider_account_id: params.providerAccountId,
        provider_login: params.providerLogin,
        encrypted_access_token: encryptSecret(params.accessToken),
        encrypted_refresh_token: params.refreshToken
          ? encryptSecret(params.refreshToken)
          : null,
        token_expires_at: params.tokenExpiresAt,
        connected_by: params.connectedBy,
        updated_at: now,
      } as typeof tables.creed_company_github_integration.$inferInsert;
    await authorizeValues(admin(), tables.creed_company_github_integration, "insert", values);
    return database.insert(tables.creed_company_github_integration).values(values).onConflictDoUpdate({ target: [tables.creed_company_github_integration.creed_id], set: conflictSet(tables.creed_company_github_integration, values), setWhere: scope });
  });
}

/**
 * Disconnect the team's GitHub: clear the token + identity (status
 * 'disconnected') but keep the row so the UI can distinguish "disconnected"
 * from "never connected". The configured repo/branch is deliberately left in
 * creed_company_version_control - it is the team's chosen target and is almost
 * always wanted again on reconnect - but its sync bookkeeping is reset so the
 * UI doesn't claim it is still in sync with a token it no longer holds.
 */
export async function clearCompanyGitHubIntegration(creedId: string): Promise<void> {
  const db = admin();
  await Promise.all([
    query(db, tables.creed_company_github_integration, "update", async (database, scope) => {
    const values = {
        status: "disconnected",
        provider_account_id: null,
        provider_login: null,
        encrypted_access_token: null,
        encrypted_refresh_token: null,
        token_expires_at: null,
        updated_at: new Date().toISOString(),
      } as Partial<typeof tables.creed_company_github_integration.$inferInsert>;
    await authorizeValues(db, tables.creed_company_github_integration, "update", values);
    return database.update(tables.creed_company_github_integration).set(values).where(and(scope, eq(tables.creed_company_github_integration.creed_id, creedId)));
  }),
    query(db, tables.creed_company_version_control, "update", async (database, scope) => {
    const values = { sync_status: "unknown" } as Partial<typeof tables.creed_company_version_control.$inferInsert>;
    await authorizeValues(db, tables.creed_company_version_control, "update", values);
    return database.update(tables.creed_company_version_control).set(values).where(and(scope, eq(tables.creed_company_version_control.creed_id, creedId)));
  }),
  ]);
}

function shouldRefresh(integration: CompanyGitHubIntegration): boolean {
  const creds = getGitHubOAuthAppCredentials();
  if (!integration.refreshToken || !creds.clientId || !creds.clientSecret) {
    return false;
  }
  if (!integration.tokenExpiresAt) return false;
  // Refresh a couple of minutes early to avoid a mid-request expiry.
  return new Date(integration.tokenExpiresAt).getTime() <= Date.now() + 2 * 60 * 1000;
}

async function refreshCompanyToken(
  creedId: string,
  integration: CompanyGitHubIntegration
): Promise<CompanyGitHubIntegration> {
  const creds = getGitHubOAuthAppCredentials();
  if (!integration.refreshToken || !creds.clientId || !creds.clientSecret) {
    return integration;
  }
  const refreshed = await refreshGitHubAccessToken(integration.refreshToken, creds);
  const now = new Date().toISOString();
  await query(admin(), tables.creed_company_github_integration, "update", async (database, scope) => {
    const values = {
      encrypted_access_token: encryptSecret(refreshed.accessToken),
      encrypted_refresh_token: refreshed.refreshToken
        ? encryptSecret(refreshed.refreshToken)
        : integration.refreshToken
          ? encryptSecret(integration.refreshToken)
          : null,
      token_expires_at: refreshed.expiresAt,
      status: "connected",
      updated_at: now,
    } as Partial<typeof tables.creed_company_github_integration.$inferInsert>;
    await authorizeValues(admin(), tables.creed_company_github_integration, "update", values);
    return database.update(tables.creed_company_github_integration).set(values).where(and(scope, eq(tables.creed_company_github_integration.creed_id, creedId)));
  });
  return {
    ...integration,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? integration.refreshToken,
    tokenExpiresAt: refreshed.expiresAt,
    status: "connected",
  };
}

/**
 * Resolve a usable team access token, refreshing first if it is about to
 * expire. Throws a friendly error when the team has not connected GitHub, so
 * routes surface "connect in Settings" rather than a raw 401.
 */
export async function requireCompanyGitHubAccess(
  creedId: string
): Promise<{ accessToken: string; integration: CompanyGitHubIntegration }> {
  let integration = await readCompanyGitHubIntegration(creedId);
  if (!integration?.accessToken) {
    throw new Error(
      "This team hasn't connected GitHub yet. An owner or admin can connect it in Settings."
    );
  }
  if (shouldRefresh(integration)) {
    integration = await refreshCompanyToken(creedId, integration);
  }
  return { accessToken: integration.accessToken!, integration };
}

function isRefreshableGitHubError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return /bad credentials|token.*expired|expired.*token|401/i.test(message);
}

/**
 * Run a GitHub operation on the team token, retrying once with a forced refresh
 * if GitHub rejects the token as expired. Mirrors withAuthenticatedGitHubAccess
 * for the personal connection.
 */
export async function withCompanyGitHubAccess<T>(
  creedId: string,
  operation: (accessToken: string) => Promise<T>
): Promise<T> {
  const { accessToken, integration } = await requireCompanyGitHubAccess(creedId);
  try {
    return await operation(accessToken);
  } catch (error) {
    if (!integration.refreshToken || !isRefreshableGitHubError(error)) {
      throw error;
    }
    const refreshed = await refreshCompanyToken(creedId, integration);
    if (!refreshed.accessToken) throw error;
    return operation(refreshed.accessToken);
  }
}
