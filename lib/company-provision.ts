import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseLikeClient } from "@/lib/supabase/types";

// Company provisioning. Billing was removed from the product, so a company
// Creed is created directly by its signed-in owner instead of by a Stripe
// checkout webhook: a company shell in onboarding stage plus the owner
// membership. The company onboarding flow takes it from there.

/** Does the user already own a company Creed? One owned company per user. */
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
 * Create (or resume) the caller's company Creed shell. Idempotent per owner:
 * an existing owned company is returned as-is, so a retry never creates a
 * second one. Returns the company Creed id.
 */
export async function provisionCompany(userId: string): Promise<string> {
  const admin = getSupabaseAdminClient() as unknown as SupabaseLikeClient;

  // Reuse an in-flight company shell for this owner if one exists, else create
  // the Creed in onboarding stage.
  let creedId: string;
  const { data: shell, error: shellError } = (await admin
    .from("creeds")
    .select("id")
    .eq("owner_user_id", userId)
    .eq("type", "company")
    .limit(1)
    .maybeSingle()) as {
    data: { id: string } | null;
    error: { message: string } | null;
  };

  if (shellError) {
    throw new Error(shellError.message);
  }

  if (shell) {
    creedId = shell.id;
  } else {
    const { data: created, error: createError } = (await admin
      .from("creeds")
      .insert({
        type: "company",
        name: "Your company",
        owner_user_id: userId,
        onboarding_stage: "questions",
      })
      .select("id")
      .single()) as {
      data: { id: string } | null;
      error: { code?: string; message: string } | null;
    };

    if (createError?.code === "23505") {
      const { data: concurrentShell, error: concurrentError } = (await admin
        .from("creeds")
        .select("id")
        .eq("owner_user_id", userId)
        .eq("type", "company")
        .single()) as {
        data: { id: string } | null;
        error: { message: string } | null;
      };
      if (concurrentError || !concurrentShell) {
        throw new Error(concurrentError?.message ?? "Could not resume the company Creed.");
      }
      creedId = concurrentShell.id;
    } else if (createError || !created) {
      throw new Error(createError?.message ?? "Could not create the company Creed.");
    } else {
      creedId = created.id;
    }
  }

  // Owner membership (idempotent via the (creed_id, user_id) PK). Load-bearing:
  // a silent failure would leave the owner with a company they cannot open.
  const { error: memberError } = await admin.from("creed_members").upsert(
    { creed_id: creedId, user_id: userId, role: "owner" },
    { onConflict: "creed_id,user_id" }
  );
  if (memberError) {
    throw new Error(memberError.message ?? "Could not create owner membership.");
  }

  return creedId;
}
