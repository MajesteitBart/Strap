import * as tables from "@/db/schema/application";
import { authorizeValues } from "@/lib/authz/policies";
import { query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import { isDatabaseConfigured } from "@/lib/env";
import { log } from "@/lib/observability";
import "server-only";

export type AuditAction =
  | "tokens.rotated"
  | "mcp.token_rotated"
  | "github.connected"
  | "github.disconnected"
  | "account.deleted"
  | "billing.legacy_cancelled"
  | "ai.settings_updated"
  | "creed.claimed"
  | "creed.composed"
  | "creed.imported"
  | "headless.key_created"
  | "headless.key_revoked"
  | "oauth.device_approved"
  | "oauth.device_denied"
  | "vault.secret_created"
  | "vault.secret_revealed"
  | "vault.secret_updated"
  | "vault.secret_deleted"
  // Company plan
  | "company.provisioned"
  | "company.invite_created"
  | "company.invite_resent"
  | "company.invite_revoked"
  | "company.invite_accepted"
  | "company.invite_declined"
  | "company.member_removed"
  | "company.role_changed"
  | "company.permission_changed"
  | "company.seats_changed"
  | "company.byok_updated"
  | "company.ai_mode_updated"
  | "company.ownership_transferred"
  | "company.version_control_updated"
  | "company.github_connected"
  | "company.github_disconnected"
  | "company.deleted";

export type AuditLogInput = {
  userId: string;
  action: AuditAction;
  metadata?: Record<string, unknown>;
  request?: Request;
};

function clientIp(request: Request | undefined): string | null {
  if (!request) return null;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip") || null;
}

/**
 * Fire-and-forget audit log entry. Never throws - audit failures should never
 * block a sensitive action from completing. Call this after the action succeeds
 * so failed actions don't pollute the log.
 */
export async function recordAuditEvent(input: AuditLogInput): Promise<void> {
  if (!isDatabaseConfigured()) {
    return;
  }

  try {
    const admin = serviceContext("lib/audit-log.ts");
    await query(admin, tables.creed_audit_log, "insert", async (database, _scope) => {
    const values = {
      user_id: input.userId,
      action: input.action,
      metadata: input.metadata ?? {},
      ip_address: clientIp(input.request),
      user_agent: input.request?.headers.get("user-agent") ?? null,
    } as typeof tables.creed_audit_log.$inferInsert;
    await authorizeValues(admin, tables.creed_audit_log, "insert", values);
    return database.insert(tables.creed_audit_log).values(values);
  });
  } catch (error) {
    // Audit is best-effort (never blocks the mutation), but the failure must
    // still be observable - the old console.warn was gated to non-production,
    // so audit-write failures were invisible in prod.
    log.warn(
      "audit_log_failed",
      { action: input.action },
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

/**
 * Required audit write for actions where the audit row is a compensating
 * security control. Unlike recordAuditEvent, this throws when persistence is
 * unavailable so callers can fail closed before returning sensitive data.
 */
export async function recordRequiredAuditEvent(input: AuditLogInput): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error("Audit logging is unavailable.");
  }

  const admin = serviceContext("lib/audit-log.ts");
  const { error } = await query(admin, tables.creed_audit_log, "insert", async (database, _scope) => {
    const values = {
    user_id: input.userId,
    action: input.action,
    metadata: input.metadata ?? {},
    ip_address: clientIp(input.request),
    user_agent: input.request?.headers.get("user-agent") ?? null,
  } as typeof tables.creed_audit_log.$inferInsert;
    await authorizeValues(admin, tables.creed_audit_log, "insert", values);
    return database.insert(tables.creed_audit_log).values(values);
  });
  if (error) {
    throw new Error("Required audit event could not be persisted.");
  }
}
