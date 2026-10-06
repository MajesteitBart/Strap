import { getTableColumns, sql, type Column, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

// Reads several tables in one statement by nesting their rows as JSON.
//
// postgres.js sends every statement with parameters in two round trips (it
// asks the server for the parameter types before binding), and statements on
// one connection never overlap. Ten separate selects therefore cost twenty
// round trips even inside Promise.all. One select with ten JSON subqueries
// costs two.
//
// decodeRow returns the same values a plain Drizzle select would: each column
// travels in the form postgres.js would hand Drizzle and then goes through the
// column's own mapFromDriverValue.

const JSON_NUMBER_TYPES = new Set(["integer", "smallint", "real", "double precision"]);
const KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

function jsonValue(column: Column): SQL {
  switch (column.dataType) {
    case "boolean":
    case "json":
      return sql`${column}`;
    case "number":
      if (JSON_NUMBER_TYPES.has(column.getSQLType())) return sql`${column}`;
      return sql`${column}::text`;
    // Drizzle turns off postgres.js date parsing, so timestamps reach it as
    // Postgres text. Casting here keeps that exact format; to_json would
    // switch to ISO 8601 with a "T".
    case "string":
    case "date":
    case "bigint":
      return sql`${column}::text`;
    default:
      throw new Error(`Column type ${column.columnType} cannot be read as a JSON row.`);
  }
}

/** One row of `table` as a JSON object keyed like Drizzle's select() result. */
export function rowJson(table: PgTable, keys?: readonly string[]): SQL {
  const columns = getTableColumns(table);
  const names = keys ?? Object.keys(columns);
  // json_build_object takes at most 100 arguments.
  if (names.length > 50) throw new Error("Too many columns for one JSON row.");
  const pairs = names.map((key) => {
    const column = columns[key];
    if (!column || !KEY.test(key)) throw new Error(`Unknown column "${key}".`);
    return sql`${sql.raw(`'${key}'`)}, ${jsonValue(column)}`;
  });
  return sql`json_build_object(${sql.join(pairs, sql`, `)})`;
}

/** The single row matching `where` (a unique key) as JSON, or null. */
export function jsonRow(table: PgTable, where: SQL, keys?: readonly string[]): SQL {
  return sql`(select ${rowJson(table, keys)} from ${table} where ${where})`;
}

/** The rows matching `where` as a JSON array, in `orderBy` order. */
export function jsonRows(table: PgTable, options: { where: SQL; orderBy: SQL; limit?: number; keys?: readonly string[] }): SQL {
  const limit = options.limit === undefined ? sql`` : sql` limit ${options.limit}`;
  return sql`(select coalesce(json_agg(page.item order by page.ordinal), '[]'::json) from (select ${rowJson(table, options.keys)} as item, row_number() over (order by ${options.orderBy}) as ordinal from ${table} where ${options.where} order by ${options.orderBy}${limit}) page)`;
}

/** Turns a JSON row back into the values Drizzle's select() returns. */
export function decodeRow(table: PgTable, value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const columns = getTableColumns(table);
  const row: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(value)) {
    const column = columns[key];
    row[key] = field === null || !column ? field : column.mapFromDriverValue(field);
  }
  return row;
}

export function decodeRows(table: PgTable, value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => decodeRow(table, item)).filter((row): row is Record<string, unknown> => row !== null);
}
