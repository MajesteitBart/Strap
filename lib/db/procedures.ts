import { sql } from "drizzle-orm";
import { requireService, type DatabaseContext } from "./context.ts";

// Only the retained, reviewed SQL functions are callable. Each function binds
// actor ids and validates its own membership/role or opaque credential.
const procedures = {
  provision_company_creed: ["p_owner"],
  transfer_creed_ownership: ["p_creed_id", "p_from", "p_to"],
  increment_mcp_read_for_creed: ["p_creed_id", "p_reader_user_id", "p_client_id", "p_day"],
  record_oauth_device_verification: ["p_user_code_hash"],
  consume_oauth_device_authorization: ["p_device_code_hash", "p_client_id"],
  strap_skills_read: ["p_user_id", "p_strap_id", "p_name", "p_revision"],
  strap_skill_publish: ["p_user_id", "p_strap_id", "p_name", "p_base_revision", "p_description", "p_files", "p_digest", "p_byte_count", "p_archived"],
} as const;
export type ProcedureName = keyof typeof procedures;

export async function callProcedure(context: DatabaseContext, name: ProcedureName, args: Record<string, unknown>): Promise<{ data: unknown; error: { code: string; message: string } | null }> {
  requireService(context);
  try {
    const parameters = procedures[name].map(key => key === "p_files" ? sql`${args[key] == null ? null : JSON.stringify(args[key])}::jsonb` : sql`${args[key] ?? null}`);
    const call = sql`public.${sql.identifier(name)}(${sql.join(parameters, sql`, `)})`;
    const tabular = name === "record_oauth_device_verification" || name === "consume_oauth_device_authorization";
    const rows = await context.database.execute(tabular ? sql`select * from ${call}` : sql`select ${call} as value`);
    return { data: tabular ? rows : rows[0]?.value ?? null, error: null };
  } catch (error) {
    const cause = error instanceof Error && error.cause ? error.cause : error;
    const code = cause && typeof cause === "object" && "code" in cause && typeof cause.code === "string" ? cause.code : "DATABASE_ERROR";
    const known = ["42501", "P0002", "PT409", "22023", "54000"].includes(code);
    return { data: null, error: { code, message: known && cause instanceof Error ? cause.message : "Database operation failed." } };
  }
}
