import "server-only";
import type { SupabaseLikeClient } from "@/lib/supabase/types";
import { legacyDeletionBlocker } from "@/lib/legacy-subscriptions";

function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.some((item) =>
    !item || typeof item !== "object" || Array.isArray(item))) {
    throw new Error("Could not inspect legacy billing records.");
  }
  return value as Record<string, unknown>[];
}

/** Inspect every billing record that the requested deletion would cascade away. */
export async function checkLegacyDeletion(
  db: SupabaseLikeClient,
  target: { scope: "account"; userId: string } | { scope: "company"; strapId: string },
): Promise<{ error: string; status: number } | null> {
  try {
    let companyIds: string[];
    let billingRows: Record<string, unknown>[] = [];
    if (target.scope === "account") {
      const [personal, owned] = await Promise.all([
        db.from("creed_entitlements").select("stripe_subscription_id, billing_mode").eq("user_id", target.userId),
        db.from("creeds").select("id").eq("owner_user_id", target.userId).eq("type", "company"),
      ]);
      if (personal.error || owned.error) throw new Error("Legacy billing lookup failed.");
      billingRows = rows(personal.data);
      companyIds = rows(owned.data).map((item) => {
        if (typeof item.id !== "string") throw new Error("Invalid Company identifier.");
        return item.id;
      });
    } else {
      companyIds = [target.strapId];
    }
    if (companyIds.length) {
      // Match the cascading Company ids, even if old billing ownership is stale.
      const company = await db.from("creed_company_billing")
        .select("stripe_subscription_id, billing_mode").in("creed_id", companyIds);
      if (company.error) throw new Error("Legacy billing lookup failed.");
      billingRows.push(...rows(company.data));
    }
    if (billingRows.some((item) => item.billing_mode === "subscription" &&
      (typeof item.stripe_subscription_id !== "string" || !item.stripe_subscription_id.trim()))) {
      return { error: "A legacy subscription record is incomplete. Contact support to verify billing before deleting.", status: 409 };
    }
    const subscriptionIds = billingRows.flatMap((item) =>
      typeof item.stripe_subscription_id === "string" && item.stripe_subscription_id.trim()
        ? [item.stripe_subscription_id.trim()] : []);
    return legacyDeletionBlocker(subscriptionIds, process.env.STRIPE_SECRET_KEY?.trim());
  } catch {
    return { error: "Could not check legacy subscriptions before deletion. Please try again.", status: 500 };
  }
}
