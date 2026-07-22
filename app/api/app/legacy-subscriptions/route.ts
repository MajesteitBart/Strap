import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { NO_STORE_HEADERS } from "@/lib/http-headers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseLikeClient } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LegacySubscription = {
  scope: "personal" | "company";
  creedId: string | null;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

const ACTIVE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "incomplete",
]);

export async function GET() {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const [personalResult, companyResult] = await Promise.all([
    auth.supabase
      .from("creed_entitlements")
      .select(
        "status,current_period_end,cancel_at_period_end,stripe_subscription_id",
      )
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    auth.supabase
      .from("creed_company_billing")
      .select(
        "creed_id,status,current_period_end,cancel_at_period_end,stripe_subscription_id",
      )
      .eq("owner_user_id", auth.user.id),
  ]);

  if (personalResult.error || companyResult.error) {
    return NextResponse.json(
      { error: "Could not check legacy subscriptions." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const subscriptions: LegacySubscription[] = [];
  const personal = personalResult.data;
  if (
    personal?.stripe_subscription_id &&
    personal.status &&
    ACTIVE_STATUSES.has(personal.status)
  ) {
    subscriptions.push({
      scope: "personal",
      creedId: null,
      status: personal.status,
      currentPeriodEnd: personal.current_period_end ?? null,
      cancelAtPeriodEnd: Boolean(personal.cancel_at_period_end),
    });
  }

  for (const company of companyResult.data ?? []) {
    if (
      company.stripe_subscription_id &&
      company.status &&
      ACTIVE_STATUSES.has(company.status)
    ) {
      subscriptions.push({
        scope: "company",
        creedId: company.creed_id,
        status: company.status,
        currentPeriodEnd: company.current_period_end ?? null,
        cancelAtPeriodEnd: Boolean(company.cancel_at_period_end),
      });
    }
  }

  return NextResponse.json(
    { configured: Boolean(process.env.STRIPE_SECRET_KEY), subscriptions },
    { headers: NO_STORE_HEADERS },
  );
}

export async function DELETE(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "Legacy subscription cancellation is not configured." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    scope?: unknown;
    creedId?: unknown;
  };

  let subscriptionId: string | null = null;
  if (body.scope === "personal") {
    const { data, error } = await auth.supabase
      .from("creed_entitlements")
      .select("stripe_subscription_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    subscriptionId = data?.stripe_subscription_id ?? null;
  } else if (body.scope === "company" && typeof body.creedId === "string") {
    const { data, error } = await auth.supabase
      .from("creed_company_billing")
      .select("stripe_subscription_id")
      .eq("creed_id", body.creedId)
      .eq("owner_user_id", auth.user.id)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    subscriptionId = data?.stripe_subscription_id ?? null;
  } else {
    return NextResponse.json(
      { error: "Invalid subscription scope." },
      { status: 400 },
    );
  }

  if (!subscriptionId) {
    return NextResponse.json(
      { error: "No active legacy subscription found." },
      { status: 404 },
    );
  }

  const stripeResponse = await fetch(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ cancel_at_period_end: "true" }),
      cache: "no-store",
    },
  );
  const stripePayload = (await stripeResponse.json().catch(() => ({}))) as {
    error?: { message?: string };
    current_period_end?: number;
  };

  if (!stripeResponse.ok) {
    return NextResponse.json(
      {
        error:
          stripePayload.error?.message ??
          "Stripe could not cancel the subscription.",
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }

  const patch = {
    cancel_at_period_end: true,
    ...(typeof stripePayload.current_period_end === "number"
      ? {
          current_period_end: new Date(
            stripePayload.current_period_end * 1000,
          ).toISOString(),
        }
      : {}),
  };
  const admin = getSupabaseAdminClient() as unknown as SupabaseLikeClient;
  const update =
    body.scope === "personal"
      ? await admin
          .from("creed_entitlements")
          .update(patch)
          .eq("user_id", auth.user.id)
      : await admin
          .from("creed_company_billing")
          .update(patch)
          .eq("creed_id", body.creedId as string);

  if (update.error) {
    return NextResponse.json(
      {
        error:
          "Stripe cancellation succeeded, but the local status could not be updated.",
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
