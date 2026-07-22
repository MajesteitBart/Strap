import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseLikeClient } from "@/lib/supabase/types";

// One-time welcome tour state. Historically keyed off the purchase records
// (creed_entitlements / creed_company_billing paid_at + welcomed_at); those
// tables remain as the tour's storage after billing was removed, so existing
// users keep their dismissed state. Accounts without a row simply never see
// the tour, and every helper is fully fault-tolerant: any error resolves to
// "don't show" so this can never affect app access.

/**
 * Should the one-time welcome pop-up show? True when the user has never
 * dismissed it, or dismissed it before their `paid_at` anchor date.
 */
export function shouldShowWelcome(
  paidAt: string | null,
  welcomedAt: string | null
): boolean {
  if (!paidAt) return false;
  if (!welcomedAt) return true;
  const paid = Date.parse(paidAt);
  const welcomed = Date.parse(welcomedAt);
  if (Number.isNaN(paid) || Number.isNaN(welcomed)) return false;
  return welcomed < paid;
}

export type WelcomeState = { showWelcome: boolean; paidAt: string | null };

/**
 * Welcome-pop-up state for the (creed-app) layout gate. Reads via the caller's
 * already-authed client (the "Read own entitlement" RLS policy).
 */
export async function getEntitlementWelcomeState(
  client: unknown,
  userId: string
): Promise<WelcomeState> {
  const db = client as SupabaseLikeClient;
  try {
    const { data, error } = (await db
      .from("creed_entitlements")
      .select("paid_at, welcomed_at")
      .eq("user_id", userId)
      .maybeSingle()) as {
      data: { paid_at?: string | null; welcomed_at?: string | null } | null;
      error: { message: string } | null;
    };
    if (error || !data) return { showWelcome: false, paidAt: null };
    const paidAt = data.paid_at ?? null;
    return {
      showWelcome: shouldShowWelcome(paidAt, data.welcomed_at ?? null),
      paidAt,
    };
  } catch {
    return { showWelcome: false, paidAt: null };
  }
}

/**
 * Mark the welcome pop-up as seen (dismissed) for a user. Writes via the
 * service-role admin client - the table has no RLS update policy.
 */
export async function markEntitlementWelcomed(userId: string): Promise<void> {
  const admin = getSupabaseAdminClient() as unknown as SupabaseLikeClient;
  const { error } = await admin
    .from("creed_entitlements")
    .update({ welcomed_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Welcome-pop-up state for a company Creed's owner, keyed on the company row.
 * Read via the admin client (the row is owner-only under RLS).
 */
export async function getCompanyWelcomeState(
  creedId: string
): Promise<WelcomeState> {
  const admin = getSupabaseAdminClient() as unknown as SupabaseLikeClient;
  try {
    const { data, error } = (await admin
      .from("creed_company_billing")
      .select("paid_at, welcomed_at")
      .eq("creed_id", creedId)
      .maybeSingle()) as {
      data: { paid_at?: string | null; welcomed_at?: string | null } | null;
      error: { message: string } | null;
    };
    if (error || !data) return { showWelcome: false, paidAt: null };
    const paidAt = data.paid_at ?? null;
    return {
      showWelcome: shouldShowWelcome(paidAt, data.welcomed_at ?? null),
      paidAt,
    };
  } catch {
    return { showWelcome: false, paidAt: null };
  }
}

/** Mark the company welcome tour as seen. Fails soft like the personal marker. */
export async function markCompanyWelcomed(creedId: string): Promise<void> {
  const admin = getSupabaseAdminClient() as unknown as SupabaseLikeClient;
  const { error } = await admin
    .from("creed_company_billing")
    .update({ welcomed_at: new Date().toISOString() })
    .eq("creed_id", creedId);
  if (error) {
    throw new Error(error.message);
  }
}
