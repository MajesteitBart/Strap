import type { ReactNode } from "react";
import { BackendSetupScreen } from "@/components/auth/backend-setup-screen";
import { StrapProvider } from "@/components/strap/strap-provider";
import { initialStrapState } from "@/lib/strap-data";
import { loadActiveStrapState } from "@/lib/strap-backend";
import { resolveActiveStrap } from "@/lib/strap-context";
import { isSupabaseTableMissingError } from "@/lib/strap-backend-errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getRequestAuth } from "@/lib/request-auth";

// Loads the signed-in user's Strap and wraps its subtree in <StrapProvider>.
// This is the dynamic, user-specific boundary that used to live in the root
// layout. Keeping it out of the root is what lets the marketing pages
// prerender as a static shell (so <Link> can fully prefetch them and
// navigation is instant) while the app shell and onboarding still get live
// user state. Used by the (strap-app) and onboarding layouts.
export async function AuthedProviders({ children }: { children: ReactNode }) {
  let initialState = initialStrapState;
  let persistenceEnabled = false;
  let missingSchemaMessage: string | null = null;

  if (isSupabaseConfigured()) {
    // Shares the layout's cached client + getUser within this render.
    const { supabase, user } = await getRequestAuth();

    if (user) {
      try {
        const active = await resolveActiveStrap(supabase, user);
        const result = await loadActiveStrapState(supabase, user, active);
        initialState = result.state;
        persistenceEnabled = result.hasPersistedCreed;
      } catch (error) {
        if (isSupabaseTableMissingError(error)) {
          missingSchemaMessage =
            error instanceof Error ? error.message : "Strap tables are missing.";
        } else {
          throw error;
        }
      }
    }
  }

  if (missingSchemaMessage) {
    return <BackendSetupScreen errorMessage={missingSchemaMessage} />;
  }

  return (
    <StrapProvider initialState={initialState} persistenceEnabled={persistenceEnabled}>
      {children}
    </StrapProvider>
  );
}
