// Local migration probe: legacy welcome state remains in its original tables.
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { creed_company_billing, creed_entitlements, creeds } from "../../../db/schema/application.ts";
import { AccessDeniedError, type Viewer } from "../../authz/viewer.ts";

export async function getPersonalWelcome(db: PostgresJsDatabase, viewer: Viewer) {
  const [row] = await db.select({ paidAt: creed_entitlements.paid_at, welcomedAt: creed_entitlements.welcomed_at })
    .from(creed_entitlements).where(eq(creed_entitlements.user_id, viewer.userId)).limit(1);
  return row ?? null;
}

export async function markPersonalWelcome(db: PostgresJsDatabase, viewer: Viewer) {
  await db.update(creed_entitlements).set({ welcomed_at: new Date().toISOString() })
    .where(eq(creed_entitlements.user_id, viewer.userId));
}

async function requireCompanyOwner(db: PostgresJsDatabase, viewer: Viewer, profileId: string) {
  const [row] = await db.select({ id: creeds.id }).from(creeds).where(and(
    eq(creeds.id, profileId), eq(creeds.type, "company"), eq(creeds.owner_user_id, viewer.userId),
  )).limit(1);
  if (!row) throw new AccessDeniedError();
}

export async function getCompanyWelcome(db: PostgresJsDatabase, viewer: Viewer, profileId: string) {
  await requireCompanyOwner(db, viewer, profileId);
  const [row] = await db.select({ paidAt: creed_company_billing.paid_at, welcomedAt: creed_company_billing.welcomed_at })
    .from(creed_company_billing).where(and(eq(creed_company_billing.creed_id, profileId), eq(creed_company_billing.owner_user_id, viewer.userId))).limit(1);
  return row ?? null;
}

export async function markCompanyWelcome(db: PostgresJsDatabase, viewer: Viewer, profileId: string) {
  await requireCompanyOwner(db, viewer, profileId);
  await db.update(creed_company_billing).set({ welcomed_at: new Date().toISOString() })
    .where(and(eq(creed_company_billing.creed_id, profileId), eq(creed_company_billing.owner_user_id, viewer.userId)));
}
