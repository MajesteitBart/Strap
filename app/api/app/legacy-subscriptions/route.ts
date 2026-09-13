import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { NO_STORE_HEADERS } from "@/lib/http-headers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseLikeClient } from "@/lib/supabase/types";
import { recordAuditEvent } from "@/lib/audit-log";
import { isOngoingSubscription, parseSubscriptionTarget, readLegacySubscriptions, requestLegacySubscription, type LegacySubscription, type LegacySubscriptionFailure } from "@/lib/legacy-subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE_HEADERS });
}

export async function GET() {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const [personalResult, companyResult, ownedResult] = await Promise.all([
    auth.supabase.from("creed_entitlements")
      .select("status,current_period_end,cancel_at_period_end,stripe_subscription_id,billing_mode")
      .eq("user_id", auth.user.id).maybeSingle(),
    auth.supabase.from("creed_company_billing")
      .select("creed_id,status,current_period_end,cancel_at_period_end,stripe_subscription_id,billing_mode"),
    auth.supabase.from("creeds").select("id")
      .eq("owner_user_id", auth.user.id).eq("type", "company"),
  ]);
  if (personalResult.error || companyResult.error || ownedResult.error) {
    return errorResponse("Could not check legacy subscriptions. Please try again.", 500);
  }
  const ownedIds = new Set((ownedResult.data ?? []).map((item) => item.id as string));
  const candidates: { subscriptionId: string; subscription: LegacySubscription }[] = [];
  const incomplete: LegacySubscriptionFailure[] = [];
  const incompleteMessage = "This legacy subscription record is incomplete. Contact support to verify billing and stop renewal.";
  const personal = personalResult.data;
  if (personal?.stripe_subscription_id?.trim()) {
    candidates.push({
      subscriptionId: personal.stripe_subscription_id,
      subscription: {
        scope: "personal", strapId: null, status: personal.status ?? "unknown",
        currentPeriodEnd: personal.current_period_end ?? null,
        cancelAtPeriodEnd: Boolean(personal.cancel_at_period_end),
      },
    });
  } else if (personal?.billing_mode === "subscription") {
    incomplete.push({ scope: "personal", strapId: null, error: incompleteMessage, requiresSupport: true });
  }
  for (const company of companyResult.data ?? []) {
    // RLS limits the read; canonical Company ownership authorizes offboarding.
    // The historical billing owner may still name a previous owner.
    if (!ownedIds.has(company.creed_id)) continue;
    if (!company.stripe_subscription_id?.trim()) {
      if (company.billing_mode === "subscription") {
        incomplete.push({ scope: "company", strapId: company.creed_id, error: incompleteMessage, requiresSupport: true });
      }
      continue;
    }
    candidates.push({
      subscriptionId: company.stripe_subscription_id,
      subscription: {
        scope: "company", strapId: company.creed_id, status: company.status ?? "unknown",
        currentPeriodEnd: company.current_period_end ?? null,
        cancelAtPeriodEnd: Boolean(company.cancel_at_period_end),
      },
    });
  }
  // Webhooks were retired with billing. Confirm each profile independently with Stripe.
  const result = await readLegacySubscriptions(candidates, secret);
  return NextResponse.json({ configured: Boolean(secret), ...result,
    failures: [...result.failures, ...incomplete] }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const target = parseSubscriptionTarget(await request.json().catch(() => null));
  if (!target) return errorResponse("Invalid subscription scope.", 400);
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) return errorResponse("Legacy subscription cancellation is not configured. Contact support.", 503);

  if (target.scope === "company") {
    const owner = await auth.supabase.from("creeds").select("id")
      .eq("id", target.strapId).eq("type", "company").eq("owner_user_id", auth.user.id).maybeSingle();
    if (owner.error) return errorResponse("Could not verify subscription ownership.", 500);
    if (!owner.data) return errorResponse("No legacy subscription found.", 404);
  }
  const result = target.scope === "personal"
    ? await auth.supabase.from("creed_entitlements").select("stripe_subscription_id,billing_mode")
        .eq("user_id", auth.user.id).maybeSingle()
    : await auth.supabase.from("creed_company_billing").select("stripe_subscription_id,billing_mode")
        .eq("creed_id", target.strapId).maybeSingle();
  if (result.error) return errorResponse("Could not check legacy subscriptions.", 500);
  const subscriptionId: unknown = result.data?.stripe_subscription_id;
  if (typeof subscriptionId !== "string" || !subscriptionId.trim()) {
    if (result.data?.billing_mode === "subscription") {
      return errorResponse("This legacy subscription record is incomplete. Contact support to verify billing and stop renewal.", 409);
    }
    return errorResponse("No legacy subscription found.", 404);
  }
  try {
    const current = await requestLegacySubscription({ subscriptionId, secret });
    // Repeated requests and already-ended subscriptions do not restart billing.
    const subscription = isOngoingSubscription(current.status) && !current.cancelAtPeriodEnd
      ? await requestLegacySubscription({ subscriptionId, secret, cancel: true })
      : current;
    const admin = getSupabaseAdminClient() as unknown as SupabaseLikeClient;
    const patch = {
      ...(!isOngoingSubscription(subscription.status) ? { status: "canceled" } : {}),
      cancel_at_period_end: subscription.cancelAtPeriodEnd,
      current_period_end: subscription.currentPeriodEnd,
    };
    // Bind the write to the authorized profile and exact subscription.
    const update = target.scope === "personal"
      ? await admin.from("creed_entitlements").update(patch)
          .eq("user_id", auth.user.id).eq("stripe_subscription_id", subscriptionId).select("user_id")
      : await admin.from("creed_company_billing").update(patch)
          .eq("creed_id", target.strapId)
          .eq("stripe_subscription_id", subscriptionId).select("creed_id");
    if (update.error || !Array.isArray(update.data) || !update.data.length) {
      return errorResponse("Stripe confirmed cancellation, but local status could not be saved. Refresh to confirm.", 500);
    }
    await recordAuditEvent({
      userId: auth.user.id, action: "billing.legacy_cancelled",
      metadata: { scope: target.scope, strapId: target.strapId }, request,
    });
    return NextResponse.json({
      ok: true,
      subscription: isOngoingSubscription(subscription.status)
        ? { ...target, ...subscription } : null,
    }, { headers: NO_STORE_HEADERS });
  } catch {
    return errorResponse("Could not confirm cancellation with Stripe. Please try again.", 502);
  }
}
