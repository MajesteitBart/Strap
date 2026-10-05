import { BackendSetupScreen } from "@/components/auth/backend-setup-screen";
import { AppPending } from "@/components/strap/app-pending";
import { StrapProvider } from "@/components/strap/strap-provider";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { getOnboardingProviders } from "../../functions/onboarding";

// Onboarding uses StrapProvider (the screen claims and previews a Strap), so it
// gets the same user-state boundary as the app shell. It lives outside the
// app layout because it has no app chrome and no entitlement gate.
export const Route = createFileRoute("/onboarding")({
  ssr: false,
  loader: () => getOnboardingProviders(),
  gcTime: 0,
  pendingComponent: AppPending,
  component: OnboardingLayout,
});

function OnboardingLayout() {
  const providers = Route.useLoaderData();
  if (providers.kind === "missing-schema") {
    return <BackendSetupScreen errorMessage={providers.message} />;
  }
  return (
    <StrapProvider initialState={providers.initialState} persistenceEnabled={providers.persistenceEnabled}>
      <Outlet />
    </StrapProvider>
  );
}
