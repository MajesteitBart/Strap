import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export async function pruneActivity(database: PostgresJsDatabase, now = new Date()) {
  const cutoff = new Date(now.getTime() - 90 * 86400000).toISOString();
  const [result] = await database.execute<{ deleted: number }>(sql`with removed as (delete from public.creed_activity where created_at < ${cutoff}::timestamptz returning 1) select count(*)::int as deleted from removed`);
  return result.deleted;
}

export async function pruneExpiredAuthorizations(database: PostgresJsDatabase, now = new Date()) {
  const [result] = await database.execute<{ device: number; codes: number }>(sql`
    with device as (delete from public.oauth_device_authorizations where expires_at < ${now.toISOString()}::timestamptz returning 1),
    codes as (delete from public.oauth_authorization_codes where expires_at < ${now.toISOString()}::timestamptz returning 1)
    select (select count(*)::int from device) as device, (select count(*)::int from codes) as codes`);
  return result;
}
