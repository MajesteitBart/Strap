// Stripe transport for retiring existing subscriptions. No checkout or new billing.
export type LegacySubscription = {
  scope: "personal" | "company";
  strapId: string | null;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type LegacySubscriptionFailure = Pick<LegacySubscription, "scope" | "strapId"> & {
  error: string;
};

export function isOngoingSubscription(status: string): boolean {
  return !["canceled", "incomplete_expired"].includes(status);
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function parseSubscriptionTarget(value: unknown):
  | { scope: "personal"; strapId: null }
  | { scope: "company"; strapId: string }
  | null {
  const body = record(value);
  if (body?.scope === "personal") return { scope: "personal", strapId: null };
  const id = body?.strapId ?? body?.creedId;
  if (body?.scope === "company" && typeof id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { scope: "company", strapId: id };
  }
  return null;
}

export async function requestLegacySubscription({
  subscriptionId, secret, cancel = false, fetcher = fetch,
}: {
  subscriptionId: string;
  secret: string;
  cancel?: boolean;
  fetcher?: typeof fetch;
}): Promise<Pick<LegacySubscription, "status" | "currentPeriodEnd" | "cancelAtPeriodEnd">> {
  const response = await fetcher(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: cancel ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Stripe-Version": "2025-06-30.basil",
        ...(cancel ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      ...(cancel ? { body: new URLSearchParams({ cancel_at_period_end: "true" }) } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );
  // A 404 can mean a wrong account or mode, not an ended subscription.
  const payload = record(await response.json().catch(() => null));
  if (!response.ok || !payload || typeof payload.status !== "string" ||
      typeof payload.cancel_at_period_end !== "boolean" || payload.id !== subscriptionId) {
    throw new Error("Could not confirm the subscription with Stripe. Please try again.");
  }
  if (cancel && !payload.cancel_at_period_end && isOngoingSubscription(payload.status)) {
    throw new Error("Stripe did not confirm cancellation. Please try again.");
  }
  const items = record(payload.items);
  const periods = Array.isArray(items?.data)
    ? items.data.map((item: unknown) => record(item)?.current_period_end)
    : [];
  // Basil places billing periods on items; older responses used the subscription root.
  const ends = [payload.current_period_end, ...periods].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0,
  );
  const end = ends.length ? new Date(Math.max(...ends) * 1000) : null;
  return {
    status: payload.status,
    cancelAtPeriodEnd: payload.cancel_at_period_end,
    currentPeriodEnd: end && Number.isFinite(end.getTime()) ? end.toISOString() : null,
  };
}

/** A provider failure for one profile must not hide another profile's subscription. */
export async function readLegacySubscriptions(
  candidates: { subscriptionId: string; subscription: LegacySubscription }[],
  secret?: string,
  fetcher?: typeof fetch,
): Promise<{ subscriptions: LegacySubscription[]; failures: LegacySubscriptionFailure[] }> {
  const results = await Promise.all(candidates.map(async ({ subscriptionId, subscription }) => {
    try {
      const live = secret
        ? await requestLegacySubscription({ subscriptionId, secret, fetcher })
        : subscription;
      return { subscription: isOngoingSubscription(live.status) ? { ...subscription, ...live } : null };
    } catch {
      return { failure: {
        scope: subscription.scope, strapId: subscription.strapId,
        error: "Could not confirm legacy subscription status with Stripe. Please try again.",
      } };
    }
  }));
  return {
    subscriptions: results.flatMap((result) => result.subscription ? [result.subscription] : []),
    failures: results.flatMap((result) => result.failure ? [result.failure] : []),
  };
}
