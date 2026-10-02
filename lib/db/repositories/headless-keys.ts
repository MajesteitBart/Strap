import { and, eq, isNull, or, sql } from "drizzle-orm";
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

/**
 * Clears the secret grants on a user's keys for one profile and returns how
 * many keys changed. Called when the user stops being a Vault manager there,
 * so the grants cannot return with a later promotion. The keys keep their
 * context access.
 */
export async function clearProfileHeadlessKeyGrants(tx: Pick<PostgresJsDatabase, "update">, userId: string, profileId: string): Promise<number> {
  const cleared = await tx.update(keys).set({ vault_item_ids: [], vault_folder_ids: [] })
    .where(and(eq(keys.user_id, userId), eq(keys.creed_id, profileId),
      or(sql`cardinality(${keys.vault_item_ids}) > 0`, sql`cardinality(${keys.vault_folder_ids}) > 0`)));
  return cleared.count;
}
