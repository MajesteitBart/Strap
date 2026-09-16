import * as tables from "@/db/schema/application";
import { callProcedure } from "@/lib/db/procedures";
import { maybeOne, query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import { and, eq } from "drizzle-orm";
import "server-only";

/** Does the user already own a Company Strap? One owned company per user. */
export async function userOwnsCompany(userId: string): Promise<boolean> {
  const admin = serviceContext("lib/company-provision.ts");
  const { data, error } = await query(admin, tables.creeds, "select", (database, scope) => database.select({ id: tables.creeds.id }).from(tables.creeds).where(and(scope, eq(tables.creeds.owner_user_id, userId), eq(tables.creeds.type, "company"))).limit(1)).then(maybeOne);
  if (error) throw new Error("Could not check Company Strap ownership.");
  return Boolean(data);
}

/** Create or resume the owner's Company Strap and membership in one transaction. */
export async function provisionCompany(userId: string): Promise<string> {
  const admin = serviceContext("lib/company-provision.ts");
  const { data, error } = await callProcedure(admin, "provision_company_creed", {
    p_owner: userId,
  });
  if (error || typeof data !== "string" || !data) {
    throw new Error("Could not create the Company Strap.");
  }
  return data;
}
