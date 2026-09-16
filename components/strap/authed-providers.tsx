import { BackendSetupScreen } from "@/components/auth/backend-setup-screen";
import { StrapProvider } from "@/components/strap/strap-provider";
import { isDatabaseConfigured } from "@/lib/env";
import { getRequestAuth } from "@/lib/request-auth";
import { loadActiveStrapState } from "@/lib/strap-backend";
import { isDatabaseTableMissingError } from "@/lib/strap-backend-errors";
import { resolveActiveStrap } from "@/lib/strap-context";
import { initialStrapState } from "@/lib/strap-data";
import type { ReactNode } from "react";

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

  if (isDatabaseConfigured()) {
    // Shares the layout's cached client + getUser within this render.
    const { context, user } = await getRequestAuth();

    if (user) {
      try {
        const active = await resolveActiveStrap(context, user);
        const result = await loadActiveStrapState(context, user, active);
        initialState = result.state;
        persistenceEnabled = result.hasPersistedCreed;
      } catch (error) {
        if (isDatabaseTableMissingError(error)) {
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
