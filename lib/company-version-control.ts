import * as tables from "@/db/schema/application";
import { authorizeValues } from "@/lib/authz/policies";
import type { DatabaseContext } from "@/lib/db/context";
import { conflictSet, maybeOne, query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import { and, eq } from "drizzle-orm";
import "server-only";

// The Company Strap's GitHub sync target + last-sync bookkeeping
// (creed_company_version_control). Configured by an owner/admin; pushes run on
// the team's GitHub token, so the connection and target are both company-level.
// Shaped to match the personal VersionControlRow columns so the same
// getConfiguredRepo / resolveSyncStatus helpers work unchanged.

export type CompanyVersionControlRow = {
  repo_owner: string | null;
  repo_name: string | null;
  branch: string | null;
  path: string | null;
  last_remote_sha: string | null;
  last_remote_message: string | null;
  last_remote_committed_at: string | null;
  last_synced_content_hash: string | null;
  sync_status: string | null;
};

function admin(): DatabaseContext {
  return serviceContext("lib/company-version-control.ts");
}

export async function readCompanyVersionControl(
  creedId: string
): Promise<CompanyVersionControlRow | null> {
  const { data } = await query(admin(), tables.creed_company_version_control, "select", (database, scope) => database.select({ repo_owner: tables.creed_company_version_control.repo_owner, repo_name: tables.creed_company_version_control.repo_name, branch: tables.creed_company_version_control.branch, path: tables.creed_company_version_control.path, last_remote_sha: tables.creed_company_version_control.last_remote_sha, last_remote_message: tables.creed_company_version_control.last_remote_message, last_remote_committed_at: tables.creed_company_version_control.last_remote_committed_at, last_synced_content_hash: tables.creed_company_version_control.last_synced_content_hash, sync_status: tables.creed_company_version_control.sync_status }).from(tables.creed_company_version_control).where(and(scope, eq(tables.creed_company_version_control.creed_id, creedId)))).then(maybeOne);
  return (data as CompanyVersionControlRow | null) ?? null;
}

// Persist the outcome of a push (or a status resolve) against the company target.
export async function updateCompanyVersionControlSync(
  creedId: string,
  patch: {
    lastRemoteSha?: string | null;
    lastRemoteMessage?: string | null;
    lastRemoteCommittedAt?: string | null;
    lastSyncedContentHash?: string | null;
    syncStatus?: string;
  }
): Promise<void> {
  const row: Record<string, unknown> = { creed_id: creedId, updated_at: new Date().toISOString() };
  if (patch.lastRemoteSha !== undefined) row.last_remote_sha = patch.lastRemoteSha;
  if (patch.lastRemoteMessage !== undefined) row.last_remote_message = patch.lastRemoteMessage;
  if (patch.lastRemoteCommittedAt !== undefined) row.last_remote_committed_at = patch.lastRemoteCommittedAt;
  if (patch.lastSyncedContentHash !== undefined) row.last_synced_content_hash = patch.lastSyncedContentHash;
  if (patch.syncStatus !== undefined) row.sync_status = patch.syncStatus;
  await query(admin(), tables.creed_company_version_control, "insert", async (database, scope) => {
    const values = row as typeof tables.creed_company_version_control.$inferInsert;
    await authorizeValues(admin(), tables.creed_company_version_control, "insert", values);
    return database.insert(tables.creed_company_version_control).values(values).onConflictDoUpdate({ target: [tables.creed_company_version_control.creed_id], set: conflictSet(tables.creed_company_version_control, values), setWhere: scope });
  });
}
