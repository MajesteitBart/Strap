import * as tables from "@/db/schema/application";
import { requireApiAuth } from "@/lib/api-auth";
import { recordAuditEvent } from "@/lib/audit-log";
import { authorizeValues } from "@/lib/authz/policies";
import { readCompanyVersionControl } from "@/lib/company-version-control";
import type { DatabaseContext } from "@/lib/db/context";
import { conflictSet, query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import { STRAP_FILE_NAME } from "@/lib/profile-file";
import { readStrapId } from "@/lib/strap-api";
import { getCreedRole } from "@/lib/strap-membership";

// The Company Strap's GitHub sync target (repo/branch). Owner/admin only.
// Pushes run on the team's GitHub connection via /api/app/github/push; this
// route only persists where the company file syncs to. Changing the repo or
// branch resets the sync bookkeeping so status is re-derived against the new
// target.

function admin(): DatabaseContext {
  return serviceContext("server/api/app/company/version-control/route.ts");
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as {
    strapId?: unknown;
    creedId?: unknown;
    repoOwner?: unknown;
    repoName?: unknown;
    branch?: unknown;
  };
  const strapId = readStrapId(b);
  if (!strapId) {
    return Response.json({ error: "strapId is required." }, { status: 400 });
  }
  for (const key of ["repoOwner", "repoName", "branch"] as const) {
    const value = b[key];
    if (value !== undefined && (typeof value !== "string" || value.length > 300)) {
      return Response.json({ error: `Invalid ${key}.` }, { status: 400 });
    }
  }

  const role = await getCreedRole(auth.context, auth.user.id, strapId);
  if (role !== "owner" && role !== "admin") {
    return Response.json({ error: "Only the owner or an admin can configure version control." }, { status: 403 });
  }

  const db = admin();
  const existing = await readCompanyVersionControl(strapId);
  const now = new Date().toISOString();
  const targetChanged = b.repoOwner !== undefined || b.repoName !== undefined || b.branch !== undefined;
  const row: Record<string, unknown> = {
    creed_id: strapId,
    provider: "github",
    configured_by: auth.user.id,
    path: existing?.path?.trim() || STRAP_FILE_NAME,
    updated_at: now,
  };
  if (b.repoOwner !== undefined) row.repo_owner = b.repoOwner || null;
  if (b.repoName !== undefined) row.repo_name = b.repoName || null;
  if (b.branch !== undefined) row.branch = b.branch || null;
  if (targetChanged) {
    row.last_remote_sha = null;
    row.last_remote_message = null;
    row.last_remote_committed_at = null;
    row.last_synced_content_hash = null;
    row.sync_status = "unknown";
  }

  const { error } = await query(db, tables.creed_company_version_control, "insert", async (database, scope) => {
    const values = row as typeof tables.creed_company_version_control.$inferInsert;
    await authorizeValues(db, tables.creed_company_version_control, "insert", values);
    return database.insert(tables.creed_company_version_control).values(values).onConflictDoUpdate({ target: [tables.creed_company_version_control.creed_id], set: conflictSet(tables.creed_company_version_control, values), setWhere: scope });
  });
  if (error) {
    return Response.json({ error: "Could not save version control settings." }, { status: 500 });
  }

  void recordAuditEvent({
    userId: auth.user.id,
    action: "company.version_control_updated",
    request,
    metadata: { creedId: strapId, repoOwner: b.repoOwner, repoName: b.repoName, branch: b.branch },
  });

  return Response.json({ ok: true });
}
