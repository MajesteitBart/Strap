import { and, eq, sql } from "drizzle-orm";
import { users } from "../../../db/schema/auth.ts";
import type { User } from "../../auth/user.ts";
import type { DatabaseContext } from "../context.ts";

export async function findUser(context: DatabaseContext, userId: string): Promise<{ data: { user: User | null }; error: { message: string } | null }> {
  try {
    const scope = context.actor.kind === "service" ? sql`true`
      : context.actor.kind === "viewer" ? sql`(${users.id} = ${context.actor.viewer.userId} or exists (select 1 from public.creed_members viewer join public.creed_members target on target.creed_id = viewer.creed_id where viewer.user_id = ${context.actor.viewer.userId} and target.user_id = ${users.id}))`
      : sql`false`;
    const [user] = await context.database.select().from(users).where(and(eq(users.id, userId), scope)).limit(1);
    return { data: { user: user ?? null }, error: null };
  } catch {
    return { data: { user: null }, error: { message: "Could not load user." } };
  }
}
