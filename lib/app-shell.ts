import { isDatabaseConfigured } from "@/lib/env";
import { getRequestAuth } from "@/lib/request-auth";
import { loadActiveStrapState } from "@/lib/strap-backend";
import { isDatabaseTableMissingError } from "@/lib/strap-backend-errors";
import { pickActiveStrap, resolveActiveStrap, type ActiveStrap } from "@/lib/strap-context";
import { initialStrapState, type StrapState } from "@/lib/strap-data";
import { readStrapMemberships, type StrapMemberships } from "@/lib/strap-membership";
import type { User } from "@/lib/auth/user";
import type { DatabaseContext } from "@/lib/db/context";
import { getCompanyWelcomeState, getEntitlementWelcomeState, type WelcomeState } from "@/lib/welcome";
import "server-only";

// Data the signed-in app and onboarding need before they render: the access
// gate's decision and the user's Strap. One server call per page load; moving
// between app pages afterwards stays on the client.

export type ProviderState =
  | { kind: "ready"; initialState: StrapState; persistenceEnabled: boolean }
  | { kind: "missing-schema"; message: string };

export type AppShellData =
  | { kind: "redirect"; to: string }
  | { kind: "missing-schema"; message: string }
  | {
      kind: "ready";
      initialState: StrapState;
      persistenceEnabled: boolean;
      showWelcome: boolean;
      welcomePaidAt: string | null;
    };

const NOT_CONFIGURED: Extract<ProviderState, { kind: "ready" }> = { kind: "ready", initialState: initialStrapState, persistenceEnabled: false };

function missingSchemaMessage(error: unknown) {
  return error instanceof Error ? error.message : "Strap tables are missing.";
}

// The user's active Strap for StrapProvider. A missing schema renders the
// backend setup screen instead of the app.
export async function loadProviderState(
  context: DatabaseContext,
  user: User | null,
  active?: ActiveStrap | null,
): Promise<ProviderState> {
  if (!user) return NOT_CONFIGURED;
  try {
    const resolved = active === undefined ? await resolveActiveStrap(context, user) : active;
    const result = await loadActiveStrapState(context, user, resolved);
    return { kind: "ready", initialState: result.state, persistenceEnabled: result.hasPersistedCreed };
  } catch (error) {
    if (isDatabaseTableMissingError(error)) return { kind: "missing-schema", message: missingSchemaMessage(error) };
    throw error;
  }
}

// Auth and onboarding gate for /file, /skills, /connections, /vault,
// /settings and /account:
//   1. signed in? if not -> /pricing
//   2. has a persisted personal Strap row (or a company membership)? if not
//      -> /onboarding
//   3. owns a Company Strap that has not finished setup? -> /onboarding/company
//
// Step 2 checks the Strap row (created by the onboarding claim step), NOT the
// section count - a user who deletes every section still has a Strap and must
// not be bounced back into first-run onboarding.
export async function loadAppShell(): Promise<AppShellData> {
  if (!isDatabaseConfigured()) {
    // Local dev without database config: skip the gate so the rest of the app
    // can render. Production deployments always configure a database.
    return { kind: "ready", ...readyState(NOT_CONFIGURED), showWelcome: false, welcomePaidAt: null };
  }

  const { context, user } = await getRequestAuth();
  if (!user) return { kind: "redirect", to: "/pricing" };

  // One read answers the gate: which Straps the user belongs to and whether
  // they own a Personal Strap. A missing table means "not onboarded".
  let memberships: StrapMemberships;
  try {
    memberships = await readStrapMemberships(context, user.id);
  } catch (error) {
    if (isDatabaseTableMissingError(error)) return { kind: "redirect", to: "/onboarding" };
    throw error;
  }
  const active = pickActiveStrap(memberships.straps);

  // Company members skip the personal first-run check; their active company
  // Strap decides what loads.
  const companyMember = memberships.straps.some((strap) => strap.type === "company");
  if (!companyMember && !memberships.personalStrapId) return { kind: "redirect", to: "/onboarding" };

  // Resume company onboarding: an owner of any Company Strap that has not
  // finished setup goes back to it rather than an empty file. Scan every
  // Strap, not just the active one, so a dual-Strap owner whose active cookie
  // points at their personal Strap is still resumed into setup.
  if (active?.creeds.some((c) => c.type === "company" && c.needsSetup && c.role === "owner")) {
    return { kind: "redirect", to: "/onboarding/company" };
  }

  const [provider, welcome] = await Promise.all([
    loadProviderState(context, user, active),
    loadWelcomeState(context, user, active),
  ]);
  if (provider.kind === "missing-schema") return provider;
  return { kind: "ready", ...readyState(provider), showWelcome: welcome.showWelcome, welcomePaidAt: welcome.paidAt };
}

function readyState(provider: Extract<ProviderState, { kind: "ready" }>) {
  return { initialState: provider.initialState, persistenceEnabled: provider.persistenceEnabled };
}

// One-time welcome pop-up. Fully fault-tolerant: any read failure resolves to
// "don't show", so this never affects app access. Inside a Company Strap the
// owner just built, read the company welcome state (its variant is amber
// "invite your team"); a non-owner viewing a company Strap gets no tour, since
// the client renders the company variant off creedType and showing the
// personal state there would mark the wrong row seen. Everyone else gets their
// personal entitlement state.
async function loadWelcomeState(context: DatabaseContext, user: User, active: ActiveStrap | null): Promise<WelcomeState> {
  const activeEntry = active?.creeds.find((c) => c.id === active.creedId) ?? null;
  if (activeEntry?.type === "company") {
    return activeEntry.role === "owner"
      ? getCompanyWelcomeState(activeEntry.id)
      : { showWelcome: false, paidAt: null };
  }
  return getEntitlementWelcomeState(context, user.id);
}
