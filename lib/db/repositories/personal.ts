import { and, eq, sql } from "drizzle-orm";
import { creed_members, creeds } from "../../../db/schema/application.ts";
import { AccessDeniedError } from "../../authz/viewer.ts";
import type { DatabaseContext } from "../context.ts";

export async function ensurePersonalProfile(context: DatabaseContext, userId: string, name: string) {
  if (context.actor.kind === "anonymous" || (context.actor.kind === "viewer" && context.actor.viewer.userId !== userId)) throw new AccessDeniedError();
  return context.database.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'personal:' + userId}, 0))`);
    const [existing] = await tx.select({ id: creeds.id }).from(creeds).where(and(eq(creeds.owner_user_id, userId), eq(creeds.type, "personal"))).limit(1);
    if (existing) return existing.id;
    const [created] = await tx.insert(creeds).values({ owner_user_id: userId, type: "personal", name }).returning({ id: creeds.id });
    await tx.insert(creed_members).values({ creed_id: created.id, user_id: userId, role: "owner" });
    return created.id;
  });
}
