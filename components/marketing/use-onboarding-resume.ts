"use client";
import { authClient } from "@/lib/auth/client";
import { useEffect, useState } from "react";
export function useOnboardingResume(configured = true): boolean {
  const { data } = authClient.useSession();
  const userId = data?.user.id;
  const [canResume, setCanResume] = useState(false);
  useEffect(() => {
    if (!configured || !userId) return;
    const controller = new AbortController();
    void fetch("/api/app/onboarding-status", { cache: "no-store", signal: controller.signal })
      .then(async response => response.ok ? response.json() as Promise<{ started?: boolean }> : null)
      .then(value => { if (!controller.signal.aborted) setCanResume(Boolean(value?.started)); })
      .catch(() => { if (!controller.signal.aborted) setCanResume(false); });
    return () => controller.abort();
  }, [configured, userId]);
  return Boolean(configured && userId && canResume);
}
