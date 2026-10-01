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
  | "headless.key_grants_updated"
  | "headless.key_rotated"
  | "oauth.device_approved"
  | "oauth.device_denied"
  | "vault.secret_created"
  | "vault.secret_revealed"
  | "vault.secret_updated"
  | "vault.secret_deleted"
  | "vault.folder_created"
  | "vault.folder_updated"
  | "vault.folder_deleted"
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
  | "company.deleted"
  // Account MFA (lib/auth/mfa.ts); metadata never contains codes or secrets
  | "mfa.enrollment_started"
  | "mfa.enabled"
  | "mfa.disabled"
  | "mfa.recovery_codes_regenerated"
  | "mfa.challenge_issued"
  | "mfa.challenge_passed"
  | "mfa.challenge_failed"
  | "mfa.replay_rejected"
  | "mfa.step_up_failed";

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
 * The audit row for an event. Callers that must commit the audit together with
 * the audited change insert this on their own transaction.
 */
export function auditRow(input: AuditLogInput): typeof tables.creed_audit_log.$inferInsert {
  return {
    user_id: input.userId,
    action: input.action,
    metadata: input.metadata ?? {},
    ip_address: clientIp(input.request),
    user_agent: input.request?.headers.get("user-agent") ?? null,
  };
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
      const values = auditRow(input);
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
