"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CONTACT_MAILTO } from "@/lib/branding";
import type { LegacySubscription, LegacySubscriptionFailure } from "@/lib/legacy-subscriptions";

type NoticeState = {
  target: string;
  subscription: LegacySubscription | null;
  configured: boolean;
  error: string | null;
};

export function LegacySubscriptionNotice({
  scope, creedId,
}: { scope: "personal" | "company"; creedId?: string }) {
  const target = scope + ":" + (creedId ?? "");
  const [state, setState] = useState<NoticeState | null>(null);
  const [reload, setReload] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const current = state?.target === target ? state : null;

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/app/legacy-subscriptions", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not check legacy subscriptions.");
        const payload = await response.json() as {
          configured: boolean; subscriptions: LegacySubscription[]; failures?: LegacySubscriptionFailure[];
        };
        if (controller.signal.aborted) return;
        setState({
          target, configured: payload.configured,
          error: payload.failures?.find((item) =>
            item.scope === scope && (scope === "personal" || item.strapId === creedId))?.error ?? null,
          subscription: payload.subscriptions.find((item) =>
            item.scope === scope && (scope === "personal" || item.strapId === creedId)) ?? null,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ target, configured: false, subscription: null,
            error: "Could not check legacy subscriptions." });
        }
      });
    return () => controller.abort();
  }, [creedId, scope, target, reload]);

  async function cancel() {
    if (cancelling) return;
    setCancelling(true);
    try {
      const response = await fetch("/api/app/legacy-subscriptions", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, strapId: creedId }),
      });
      const payload = await response.json().catch(() => ({})) as {
        error?: string; subscription?: LegacySubscription | null;
      };
      if (!response.ok) throw new Error(payload.error ?? "Could not cancel the subscription.");
      setState((previous) => previous?.target === target
        ? { ...previous, subscription: payload.subscription ?? null } : previous);
      setConfirming(false);
      toast.success("Your subscription will not renew.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel the subscription. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  if (!current || (!current.subscription && !current.error)) return null;
  const end = current.subscription?.currentPeriodEnd
    ? new Date(current.subscription.currentPeriodEnd) : null;
  const endLabel = end && Number.isFinite(end.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(end) : null;

  return (
    <section className="scroll-mt-6" aria-label="Legacy subscription">
      <h2 className="text-[16px] font-medium text-[var(--strap-text-primary)]">Legacy subscription</h2>
      <div className="mt-4 rounded-[var(--radius-xl)] border border-[var(--strap-border)] bg-[var(--strap-surface)] p-5">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-[14px] leading-7 text-[var(--strap-text-secondary)]" role="status">
            {current.error ?? (current.subscription?.cancelAtPeriodEnd
              ? "Cancellation is scheduled" + (endLabel ? " for " + endLabel : "") + ". Your subscription will not renew."
              : "Strap is free. This subscription from an older paid plan is still active" +
                (endLabel ? " through " + endLabel : "") + ".")}
          </p>
          {current.error ? (
            <Button variant="outline" onClick={() => setReload((value) => value + 1)}>Retry</Button>
          ) : !current.subscription?.cancelAtPeriodEnd ? (
            current.configured ? (
              <div className="flex shrink-0 flex-wrap gap-2">
                {confirming ? (
                  <>
                    <Button variant="outline" disabled={cancelling} onClick={() => setConfirming(false)}>Keep subscription</Button>
                    <Button disabled={cancelling} onClick={() => void cancel()}>
                      {cancelling ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                      Confirm cancellation
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setConfirming(true)}>Cancel subscription</Button>
                )}
              </div>
            ) : (
              <a href={CONTACT_MAILTO} className="shrink-0 text-sm underline underline-offset-4">
                Contact support to cancel
              </a>
            )
          ) : null}
        </div>
        {confirming ? <p className="mt-3 text-sm text-[var(--strap-text-secondary)]">
          Cancel at the end of this billing period? Your Strap and its data will remain available.
        </p> : null}
      </div>
    </section>
  );
}
