"use client";

// Shared Better Auth OAuth trigger. X maps to the twitter provider callback.


import { authClient } from "@/lib/auth/client";
import { useState } from "react";
import { toast } from "sonner";

export type OAuthProvider = "google" | "x";

// Remember the last OAuth provider the user kicked off, so the auth screen can
// surface a "Last used" hint. Written at click time (before the redirect).
const LAST_PROVIDER_KEY = "strap:last-auth-provider";
const LEGACY_LAST_PROVIDER_KEY = "creed:last-auth-provider";

export function readLastAuthProvider(): OAuthProvider | null {
  if (typeof window === "undefined") return null;
  try {
    const value =
      window.localStorage.getItem(LAST_PROVIDER_KEY) ??
      window.localStorage.getItem(LEGACY_LAST_PROVIDER_KEY);
    return value === "google" || value === "x" ? value : null;
  } catch {
    return null;
  }
}

export function useOAuthSignIn(configured: boolean = true, redirectTo?: string) {
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);

  async function signIn(provider: OAuthProvider) {
    if (!configured || pendingProvider) return;

    setPendingProvider(provider);
    try {
      window.localStorage.setItem(LAST_PROVIDER_KEY, provider);
    } catch {
      // Storage may be unavailable; the "Last used" hint is non-essential.
    }
    const { error } = await authClient.signIn.social({
      provider: provider === "x" ? "twitter" : "google",
      callbackURL: new URL(redirectTo || "/", window.location.origin).toString(),
    });

    // On success the browser is already navigating to the provider, so this
    // only runs when the handoff itself failed.
    if (error) {
      setPendingProvider(null);
      toast.error(error.message || "Could not start sign-in. Try again.");
    }
  }

  return { signIn, pendingProvider };
}
