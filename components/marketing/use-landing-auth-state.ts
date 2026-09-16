"use client";
import { authClient } from "@/lib/auth/client";
export type LandingAuthState = "loading" | "signed-in" | "signed-out";
export function useLandingAuthState(configured = true): LandingAuthState {
  const session = authClient.useSession();
  if (!configured) return "signed-out";
  if (session.isPending) return "loading";
  return session.data?.user ? "signed-in" : "signed-out";
}
