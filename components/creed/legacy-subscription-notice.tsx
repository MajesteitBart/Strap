"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Subscription = {
  scope: "personal" | "company";
  creedId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export function LegacySubscriptionNotice({
  scope,
  creedId,
}: {
  scope: "personal" | "company";
  creedId?: string;
}) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [configured, setConfigured] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/app/legacy-subscriptions", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as {
          configured?: boolean;
          subscriptions?: Subscription[];
        };
        if (!active) return;
        setConfigured(Boolean(payload.configured));
        setSubscription(
          payload.subscriptions?.find(
            (item) =>
              item.scope === scope &&
              (scope === "personal" || item.creedId === creedId),
          ) ?? null,
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [creedId, scope]);

  if (!subscription) return null;

  const endLabel = subscription.currentPeriodEnd
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(
        new Date(subscription.currentPeriodEnd),
      )
    : null;

  async function cancel() {
    if (
      !window.confirm(
        "Cancel this legacy Stripe subscription at the end of its billing period?",
      )
    ) {
      return;
    }
    setCancelling(true);
    const response = await fetch("/api/app/legacy-subscriptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, creedId }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok) {
      toast.error(payload.error ?? "Could not cancel the subscription.");
    } else {
      setSubscription((current) =>
        current ? { ...current, cancelAtPeriodEnd: true } : current,
      );
      toast.success("Subscription cancellation scheduled.");
    }
    setCancelling(false);
  }

  return (
    <section className="scroll-mt-6">
      <h2 className="text-[16px] font-medium text-[var(--creed-text-primary)]">
        Legacy subscription
      </h2>
      <div className="mt-4 rounded-[var(--radius-xl)] border border-[var(--creed-border)] bg-[var(--creed-surface)] p-5">
        <div className="flex items-center justify-between gap-5">
          <p className="text-[14px] leading-7 text-[var(--creed-text-secondary)]">
            {subscription.cancelAtPeriodEnd
              ? `Cancellation is scheduled${endLabel ? ` for ${endLabel}` : ""}.`
              : `Stripe billing has been retired, but this older subscription is still active${endLabel ? ` through ${endLabel}` : ""}.`}
          </p>
          {!subscription.cancelAtPeriodEnd ? (
            <Button
              variant="outline"
              className="shrink-0 rounded-md border-[var(--creed-border)]"
              disabled={!configured || cancelling}
              onClick={() => void cancel()}
              title={
                !configured
                  ? "Contact support to cancel this subscription."
                  : undefined
              }
            >
              {cancelling ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              Cancel subscription
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
