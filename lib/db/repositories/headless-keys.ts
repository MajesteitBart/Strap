import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { creed_headless_access_keys as keys } from "../../../db/schema/application.ts";

/**
 * Revokes a user's active headless keys for one profile and returns how many.
 * Called in the same transaction as leaving or joining the profile, so a key
 * from an earlier membership never regains its secret grants when the user is
 * invited back.
 */
export async function revokeProfileHeadlessKeys(tx: Pick<PostgresJsDatabase, "update">, userId: string, profileId: string): Promise<number> {
  const revoked = await tx.update(keys).set({ revoked_at: new Date().toISOString() })
    .where(and(eq(keys.user_id, userId), eq(keys.creed_id, profileId), isNull(keys.revoked_at)));
  return revoked.count;
}
