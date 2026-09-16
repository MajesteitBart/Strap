import { getTableColumns, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { authorizeValues, rowScope, type Operation } from "../authz/policies.ts";
import type { DatabaseContext } from "./context.ts";

export type QueryFailure = { message: string; code?: string };
export type QueryResult<T> = { data: T | null; error: QueryFailure | null };

export async function query<T>(context: DatabaseContext, table: PgTable, operation: Operation,
  run: (database: DatabaseContext["database"], scope: SQL) => PromiseLike<T>, values?: unknown): Promise<QueryResult<T>> {
  try {
    if (values !== undefined && (operation === "insert" || operation === "update")) await authorizeValues(context, table, operation, values);
    return { data: await run(context.database, rowScope(context, table, operation)), error: null };
  } catch (error) {
    const cause = error instanceof Error && error.cause ? error.cause : error;
    const code = cause && typeof cause === "object" && "code" in cause && typeof cause.code === "string" ? cause.code : undefined;
    // Driver errors can contain query arguments, including ciphertext and PII.
    return { data: null, error: { message: code === "42P01" ? "Database schema is not initialized." : "Database operation failed.", code } };
  }
}

export function maybeOne<T>(result: QueryResult<T[]>): QueryResult<T> {
  if (result.error) return { data: null, error: result.error };
  if (result.data && result.data.length > 1) return { data: null, error: { message: "Expected at most one row." } };
  return { data: result.data?.[0] ?? null, error: null };
}
export function exactlyOne<T>(result: QueryResult<T[]>): QueryResult<T> {
  const one = maybeOne(result);
  return !one.error && !one.data ? { data: null, error: { message: "Expected one row." } } : one;
}

// Update only fields supplied by the caller. Omitted defaults (created_at,
// encrypted keys, etc.) must survive an ON CONFLICT update.
export function conflictSet<T extends PgTable>(table: T, values: Partial<T["$inferInsert"]> | Partial<T["$inferInsert"]>[]) {
  const row = (Array.isArray(values) ? values[0] : values) as Record<string, unknown>;
  const columns = getTableColumns(table);
  return Object.fromEntries(Object.keys(row ?? {}).filter(key => row?.[key] !== undefined && key in columns)
    .map(key => [key, sql`excluded.${sql.identifier(columns[key].name)}`])) as Partial<Record<keyof T["$inferInsert"], SQL>>;
}
