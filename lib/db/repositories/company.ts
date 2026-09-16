import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { creed_company_version_control } from "../../../db/schema/application.ts";
import type { Viewer } from "../../authz/viewer.ts";

// Repository metadata is a manager view; provider credentials are kept in the
// separate GitHub integration repository.
export async function companyVersionControl(database: PostgresJsDatabase, viewer: Viewer, creedId: string) {
  const [row] = await database.select().from(creed_company_version_control).where(sql`
    ${creed_company_version_control.creed_id} = ${creedId}
    and exists (select 1 from public.creed_members member where member.creed_id = ${creed_company_version_control.creed_id} and member.user_id = ${viewer.userId} and member.role in ('owner','admin'))`);
  return row ?? null;
}
