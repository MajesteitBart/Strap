import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseLikeClient } from "@/lib/supabase/types";

// Company provisioning. Billing was removed from the product, so a company
// Strap is created directly by its signed-in owner instead of by a Stripe
// checkout webhook: a company shell in onboarding stage plus the owner
// membership. The company onboarding flow takes it from there.

/** Does the user already own a company Strap? One owned company per user. */
export async function userOwnsCompany(userId: string): Promise<boolean> {
  const admin = getSupabaseAdminClient() as unknown as SupabaseLikeClient;
  const { data } = (await admin
    .from("creeds")
    .select("id")
    .eq("owner_user_id", userId)
    .eq("type", "company")
    .limit(1)
    .maybeSingle()) as { data: { id: string } | null };
  return Boolean(data);
}

/**
 * Create (or resume) the caller's company Strap shell. Idempotent per owner:
 * an existing owned company is returned as-is, so a retry never creates a
 * second one. Returns the company Strap id.
 */
export async function provisionCompany(userId: string): Promise<string> {
  const admin = getSupabaseAdminClient() as unknown as {
    rpc: (
      name: string,
      params: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  const { data, error } = await admin.rpc("provision_company_creed", {
    p_owner: userId,
  });

  if (error || typeof data !== "string") {
    throw new Error(error?.message ?? "Could not create the company Strap.");
  }

  return data;
}
