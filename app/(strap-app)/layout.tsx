import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShellLayout } from "@/components/strap/app-shell-layout";
import { AppVersionNotifier } from "@/components/strap/app-version-notifier";
import { getAppVersion } from "@/lib/app-version";
import { AuthedProviders } from "@/components/strap/authed-providers";
import { hasPersistedStrap } from "@/lib/strap-backend";
import { isSupabaseTableMissingError } from "@/lib/strap-backend-errors";
import {
  getEntitlementWelcomeState,
  getCompanyWelcomeState,
} from "@/lib/welcome";
import { hasCompanyMembership } from "@/lib/strap-membership";
import { resolveActiveStrap } from "@/lib/strap-context";
import { getRequestAuth } from "@/lib/request-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Auth + onboarding gate for everything inside the (strap-app) route group
// (/file, /connections, /settings). Two-layer check:
//   1. signed in? if not → /pricing
//   2. has a persisted personal Strap row (or a company membership)? if not
//      → /onboarding
//
// Step 2 catches users who deep-link to /file (or come back via a stale
// browser tab) without having completed onboarding yet. It checks the Strap
// row (created by the onboarding claim step), NOT the section count - a user
// who deletes every section still has a Strap and must not be bounced back
// into first-run onboarding.
//
// Marketing routes don't pass through here so they remain reachable to anyone.
//
// This layout (not the root) owns the dynamic, user-specific boundary now:
// AuthedProviders loads the Strap and supplies StrapProvider, and the gate
// reads the session, so the segment renders dynamically while the root stays
// static.
export const dynamic = "force-dynamic";

export default async function StrapAppLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) {
    // Local dev without Supabase config: skip the gate so the rest of
    // the app can render. Production deployments always have Supabase.
    return (
      <AuthedProviders>
        <AppShellLayout showWelcome={false} welcomePaidAt={null}>
          {children}
        </AppShellLayout>
        <AppVersionNotifier initialVersion={getAppVersion()} />
      </AuthedProviders>
    );
  }

  const { supabase, user } = await getRequestAuth();

  if (!user) {
    redirect("/pricing");
  }

  const companyMember = await hasCompanyMembership(supabase, user.id);

  // Personal-only users pass the personal onboarding gate: a user with no
  // persisted Strap is routed to /onboarding to finish first-run. Company
  // members skip this (their active company Strap decides what loads); the
  // company onboarding flow handles a company Strap that is still being set
  // up. Treat a missing-tables error as "not onboarded".
  if (!companyMember) {
    let sectionsPersisted = false;
    try {
      sectionsPersisted = await hasPersistedStrap(supabase, user.id);
    } catch (error) {
      if (!isSupabaseTableMissingError(error)) {
        throw error;
      }
    }
    if (!sectionsPersisted) {
      redirect("/onboarding");
    }
  }

  // Resume company onboarding: if the user OWNS any company Strap that has not
  // finished setup, send them to the company onboarding flow rather than an
  // empty file. This is the "bought it, closed the laptop, came back" path - the
  // switcher's "Set up" entry lands here too. Scan every Strap, not just the
  // active one: a dual-Strap owner whose active cookie points at their personal
  // Strap (the resolveActiveStrap default) must still be resumed into setup.
  const active = await resolveActiveStrap(supabase, user);
  if (active) {
    const unfinishedOwned = active.creeds.find(
      (c) => c.type === "company" && c.needsSetup && c.role === "owner"
    );
    if (unfinishedOwned) {
      redirect("/onboarding/company");
    }
  }

  // One-time welcome pop-up. Fully fault-tolerant (see the helpers): any read
  // failure resolves to "don't show", so this never affects app access. The tour
  // is keyed to the active Strap: inside a company Strap the owner just built,
  // read the company welcome state (its variant is amber "invite your team");
  // otherwise the personal entitlement state. This matches the client-side
  // variant AppShellLayout derives from creedType.
  const activeEntry = active?.creeds.find((c) => c.id === active.creedId) ?? null;
  // The company tour is the owner's post-onboarding flow. A non-owner viewing a
  // company Strap must NOT get it (the client renders the company variant off
  // creedType, so falling back to their personal entitlement here would show the
  // wrong tour and mark the wrong row seen). Owners get the company state;
  // everyone else gets their personal state.
  let showWelcome = false;
  let paidAt: string | null = null;
  if (activeEntry?.type === "company") {
    if (activeEntry.role === "owner") {
      ({ showWelcome, paidAt } = await getCompanyWelcomeState(activeEntry.id));
    }
  } else {
    ({ showWelcome, paidAt } = await getEntitlementWelcomeState(supabase, user.id));
  }

  return (
    <AuthedProviders>
      <AppShellLayout showWelcome={showWelcome} welcomePaidAt={paidAt}>
        {children}
      </AppShellLayout>
      <AppVersionNotifier initialVersion={getAppVersion()} />
    </AuthedProviders>
  );
}
