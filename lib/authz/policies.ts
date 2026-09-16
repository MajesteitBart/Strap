import { getTableColumns, getTableName, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { DatabaseContext } from "../db/context.ts";
import { AccessDeniedError } from "./viewer.ts";

export type Operation = "select" | "insert" | "update" | "delete";
const ownManage = new Set(["creed_ai_settings", "creed_integrations", "creed_tokens", "creed_version_control"]);
const personalContent = new Set(["creed_sections", "creed_proposals", "creed_activity"]);
const memberRead = new Set(["creeds", "creed_members", "creed_connections", "creed_credits", "creed_credit_transactions", "creed_mcp_clients", "creed_mcp_read_events", "creed_quality_reports"]);

// These SQL predicates are the application equivalents of the baseline's
// 45 active RLS policies. Unknown tables/actions deny by default.
export function rowScope(context: DatabaseContext, table: PgTable, operation: Operation): SQL {
  if (context.actor.kind === "service") return sql`true`;
  if (context.actor.kind === "anonymous") return sql`false`;
  const userId = context.actor.viewer.userId;
  const name = getTableName(table);
  const columns = getTableColumns(table);
  const own = columns.user_id ? sql`${columns.user_id} = ${userId}` : sql`false`;
  const profile = name === "creeds" ? columns.id : columns.creed_id;
  const role = profile
    ? sql`(select member.role from public.creed_members member where member.creed_id = ${profile} and member.user_id = ${userId})`
    : sql`null`;
  const member = sql`${role} is not null`;
  const manager = sql`${role} in ('owner', 'admin')`;
  const personalOwner = profile ? sql`${role} = 'owner' and exists (select 1 from public.creeds profile where profile.id = ${profile} and profile.type = 'personal' and profile.owner_user_id = ${userId})` : sql`false`;
  const visible = columns.section_id && profile
    ? sql`(${manager} or not exists (select 1 from public.creed_member_section_permissions permission where permission.creed_id = ${profile} and permission.user_id = ${userId} and permission.section_id = ${columns.section_id} and permission.permission = 'hidden'))`
    : sql`true`;
  if (ownManage.has(name)) return own;
  if (name === "creed_getting_started" && operation !== "delete") return own;
  if (personalContent.has(name) && operation !== "select") return personalOwner;
  if (name === "creed_ai_usage" && operation === "insert") return own;
  if (name === "oauth_tokens" && operation === "delete") return own;
  if (operation !== "select") return sql`false`;
  if (memberRead.has(name)) return member;
  if (["creed_entitlements", "creed_audit_log", "creed_member_agent_permissions", "oauth_tokens"].includes(name)) return own;
  if (name === "creed_member_section_permissions") return sql`(${own} or ${manager})`;
  if (name === "creed_ai_usage") return sql`(${own} or ${manager})`;
  if (["creed_company_ai_settings", "creed_company_billing"].includes(name)) return sql`${role} = 'owner'`;
  if (name === "creed_invites") return manager;
  if (name === "oauth_token_creeds") return sql`exists (select 1 from public.oauth_tokens token where token.id = ${columns.token_id} and token.user_id = ${userId})`;
  if (name === "creed_sections") return sql`${member} and ${visible} and (${columns.deleted_at} is null or ${manager})`;
  if (name === "creed_activity") return sql`${member} and ${visible} and (${columns.event_kind} <> 'billing' or ${manager})`;
  if (["creed_proposals", "creed_section_versions"].includes(name)) return sql`${member} and ${visible}`;
  return sql`false`;
}

// Check the NEW row as well as rowScope's existing-row predicate. This prevents
// moving an owned row to someone else's profile and cross-profile upsert theft.
export async function authorizeValues(context: DatabaseContext, table: PgTable, operation: "insert" | "update", input: unknown) {
  if (context.actor.kind === "service") return;
  if (context.actor.kind === "anonymous") throw new AccessDeniedError();
  const userId = context.actor.viewer.userId;
  const name = getTableName(table);
  const values = Array.isArray(input) ? input : [input];
  for (const value of values) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new AccessDeniedError();
    const row = value as Record<string, unknown>;
    if (ownManage.has(name) || name === "creed_getting_started" || (name === "creed_ai_usage" && operation === "insert")) {
      if ((operation === "insert" || "user_id" in row) && row.user_id !== userId) throw new AccessDeniedError();
      continue;
    }
    if (personalContent.has(name)) {
      if ("user_id" in row && row.user_id !== userId) throw new AccessDeniedError();
      if (operation === "insert" || "creed_id" in row) {
        if (typeof row.creed_id !== "string") throw new AccessDeniedError();
        const result = await context.database.execute(sql`select 1 from public.creeds profile inner join public.creed_members member on member.creed_id = profile.id where profile.id = ${row.creed_id} and profile.type = 'personal' and profile.owner_user_id = ${userId} and member.user_id = ${userId} and member.role = 'owner'`);
        if (result.length !== 1) throw new AccessDeniedError();
      }
      continue;
    }
    throw new AccessDeniedError();
  }
}
