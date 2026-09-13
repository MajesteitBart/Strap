import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseLikeClient } from "@/lib/supabase/types";

/** Does the user already own a Company Strap? One owned company per user. */
export async function userOwnsCompany(userId: string): Promise<boolean> {
  const admin = getSupabaseAdminClient() as unknown as SupabaseLikeClient;
  const { data, error } = await admin.from("creeds").select("id")
    .eq("owner_user_id", userId).eq("type", "company").limit(1).maybeSingle();
  if (error) throw new Error("Could not check Company Strap ownership.");
  return Boolean(data);
}

/** Create or resume the owner's Company Strap and membership in one transaction. */
export async function provisionCompany(userId: string): Promise<string> {
  const admin = getSupabaseAdminClient() as unknown as {
    rpc: (name: string, parameters: Record<string, unknown>) => Promise<{
      data: unknown; error: { message: string } | null;
    }>;
  };
  const { data, error } = await admin.rpc("provision_company_creed", {
    p_owner: userId,
  });
  if (error || typeof data !== "string" || !data) {
    throw new Error("Could not create the Company Strap.");
  }
  return data;
}
