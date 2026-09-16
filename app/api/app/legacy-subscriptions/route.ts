import * as tables from "@/db/schema/application";
import { requireApiAuth } from "@/lib/api-auth";
import { recordAuditEvent } from "@/lib/audit-log";
import { authorizeValues } from "@/lib/authz/policies";
import { maybeOne, query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import { NO_STORE_HEADERS } from "@/lib/http-headers";
import { cancelLegacySubscription, isOngoingSubscription, parseSubscriptionTarget, readLegacySubscriptions, type LegacySubscription, type LegacySubscriptionFailure } from "@/lib/legacy-subscriptions";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

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
    query(auth.context, tables.creed_entitlements, "select", (database, scope) => database.select({ status: tables.creed_entitlements.status, current_period_end: tables.creed_entitlements.current_period_end, cancel_at_period_end: tables.creed_entitlements.cancel_at_period_end, stripe_subscription_id: tables.creed_entitlements.stripe_subscription_id, billing_mode: tables.creed_entitlements.billing_mode }).from(tables.creed_entitlements).where(and(scope, eq(tables.creed_entitlements.user_id, auth.user.id)))).then(maybeOne),
    query(auth.context, tables.creed_company_billing, "select", (database, scope) => database.select({ creed_id: tables.creed_company_billing.creed_id, status: tables.creed_company_billing.status, current_period_end: tables.creed_company_billing.current_period_end, cancel_at_period_end: tables.creed_company_billing.cancel_at_period_end, stripe_subscription_id: tables.creed_company_billing.stripe_subscription_id, billing_mode: tables.creed_company_billing.billing_mode }).from(tables.creed_company_billing).where(and(scope))),
    query(auth.context, tables.creeds, "select", (database, scope) => database.select({ id: tables.creeds.id }).from(tables.creeds).where(and(scope, eq(tables.creeds.owner_user_id, auth.user.id), eq(tables.creeds.type, "company")))),
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

  const verifyOwnership = async () => {
    if (target.scope === "personal") return null;
    const owner = await query(auth.context, tables.creeds, "select", (database, scope) => database.select({ id: tables.creeds.id }).from(tables.creeds).where(and(scope, eq(tables.creeds.id, target.strapId), eq(tables.creeds.type, "company"), eq(tables.creeds.owner_user_id, auth.user.id)))).then(maybeOne);
    if (owner.error) return { error: "Could not verify subscription ownership.", status: 500 };
    return owner.data ? null : { error: "No legacy subscription found.", status: 404 };
  };
  const denied = await verifyOwnership();
  if (denied) return errorResponse(denied.error, denied.status);
  const result = target.scope === "personal"
    ? await query(auth.context, tables.creed_entitlements, "select", (database, scope) => database.select({ stripe_subscription_id: tables.creed_entitlements.stripe_subscription_id, billing_mode: tables.creed_entitlements.billing_mode }).from(tables.creed_entitlements).where(and(scope, eq(tables.creed_entitlements.user_id, auth.user.id)))).then(maybeOne)
    : await query(auth.context, tables.creed_company_billing, "select", (database, scope) => database.select({ stripe_subscription_id: tables.creed_company_billing.stripe_subscription_id, billing_mode: tables.creed_company_billing.billing_mode }).from(tables.creed_company_billing).where(and(scope, eq(tables.creed_company_billing.creed_id, target.strapId)))).then(maybeOne);
  if (result.error) return errorResponse("Could not check legacy subscriptions.", 500);
  const subscriptionId: unknown = result.data?.stripe_subscription_id;
  if (typeof subscriptionId !== "string" || !subscriptionId.trim()) {
    if (result.data?.billing_mode === "subscription") {
      return errorResponse("This legacy subscription record is incomplete. Contact support to verify billing and stop renewal.", 409);
    }
    return errorResponse("No legacy subscription found.", 404);
  }
  try {
    // Ownership may change while Stripe is responding. Recheck the canonical
    // Company owner immediately before provider cancellation and local writes.
    const cancellation = await cancelLegacySubscription({ subscriptionId, secret, revalidate: verifyOwnership });
    if ("error" in cancellation) return errorResponse(cancellation.error, cancellation.status);
    const { subscription } = cancellation;
    const admin = serviceContext("app/api/app/legacy-subscriptions/route.ts");
    const patch = {
      ...(!isOngoingSubscription(subscription.status) ? { status: "canceled" } : {}),
      cancel_at_period_end: subscription.cancelAtPeriodEnd,
      current_period_end: subscription.currentPeriodEnd,
    };
    // Bind the write to the authorized profile and exact subscription.
    const update = target.scope === "personal"
      ? await query(admin, tables.creed_entitlements, "update", async (database, scope) => {
    const values = patch as Partial<typeof tables.creed_entitlements.$inferInsert>;
    await authorizeValues(admin, tables.creed_entitlements, "update", values);
    return database.update(tables.creed_entitlements).set(values).where(and(scope, eq(tables.creed_entitlements.user_id, auth.user.id), eq(tables.creed_entitlements.stripe_subscription_id, subscriptionId))).returning({ user_id: tables.creed_entitlements.user_id });
  })
      : await query(admin, tables.creed_company_billing, "update", async (database, scope) => {
    const values = patch as Partial<typeof tables.creed_company_billing.$inferInsert>;
    await authorizeValues(admin, tables.creed_company_billing, "update", values);
    return database.update(tables.creed_company_billing).set(values).where(and(scope, eq(tables.creed_company_billing.creed_id, target.strapId), eq(tables.creed_company_billing.stripe_subscription_id, subscriptionId))).returning({ creed_id: tables.creed_company_billing.creed_id });
  });
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
