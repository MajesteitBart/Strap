import * as tables from "@/db/schema/application";
import { loadProviderState, type ProviderState } from "@/lib/app-shell";
import { query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import { isDatabaseConfigured } from "@/lib/env";
import { getRequestAuth } from "@/lib/request-auth";
import { initialStrapState } from "@/lib/strap-data";
import { loadStrapState } from "@/lib/strap-backend";
import { isDatabaseTableMissingError } from "@/lib/strap-backend-errors";
import { and, eq } from "drizzle-orm";
import "server-only";

// Onboarding lives outside the app's access gate: anyone signed in can run it
// and then go straight into the app. It still needs StrapProvider, because the
// screen claims and previews a Strap.

export async function loadOnboardingProviders(): Promise<ProviderState> {
  if (!isDatabaseConfigured()) return { kind: "ready", initialState: initialStrapState, persistenceEnabled: false };
  const { context, user } = await getRequestAuth();
  return loadProviderState(context, user);
}

export type OnboardingStage = "prompt" | "preview" | undefined;

// Resume point for the personal onboarding screen. A composed Strap resumes on
// the preview; a claimed-but-not-composed seed resumes on the prompt step;
// otherwise the screen starts at step 0.
export async function loadOnboardingStage(): Promise<{ kind: "redirect"; to: string } | { kind: "ready"; initialStage: OnboardingStage }> {
  if (!isDatabaseConfigured()) return { kind: "ready", initialStage: undefined };
  const { context, user } = await getRequestAuth();
  if (!user) return { kind: "redirect", to: "/home" };

  try {
    // "Composed" == any section last edited by an agent; "hasPersistedCreed"
    // means the seed was claimed.
    const result = await loadStrapState(context, user);
    if (result.state.sections.some((section) => section.lastEditedType === "agent")) {
      return { kind: "ready", initialStage: "preview" };
    }
    return { kind: "ready", initialStage: result.hasPersistedCreed ? "prompt" : undefined };
  } catch (error) {
    if (isDatabaseTableMissingError(error)) return { kind: "ready", initialStage: undefined };
    throw error;
  }
}

// Company onboarding: a signed-in owner of a Company Strap that is still being
// set up. Anyone else goes to sign-in or into the app.
export async function loadCompanyOnboarding(): Promise<{ kind: "redirect"; to: string } | { kind: "ready"; creedId: string }> {
  if (!isDatabaseConfigured()) return { kind: "redirect", to: "/pricing" };
  const { user } = await getRequestAuth();
  if (!user) return { kind: "redirect", to: "/login?next=/onboarding/company" };

  const admin = serviceContext("lib/onboarding-gate.ts");
  const { data: owned } = (await query(admin, tables.creeds, "select", (database, scope) => database.select({ id: tables.creeds.id, onboarding_stage: tables.creeds.onboarding_stage }).from(tables.creeds).where(and(scope, eq(tables.creeds.owner_user_id, user.id), eq(tables.creeds.type, "company"))))) as { data: Array<{ id: string; onboarding_stage: string | null }> | null };

  const pending = (owned ?? []).find((c) => c.onboarding_stage != null);
  // Nothing to set up (already done, or not an owner). Go to the app.
  if (!pending) return { kind: "redirect", to: "/file" };
  return { kind: "ready", creedId: pending.id };
}
