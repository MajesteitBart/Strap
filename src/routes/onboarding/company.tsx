import { CompanyOnboardingScreen } from "@/components/strap/company-onboarding-screen";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCompanyOnboarding } from "../../functions/onboarding";

// Company onboarding. The owner lands here while a Company Strap they own is
// still being set up; everyone else is sent to sign-in or into the app.
export const Route = createFileRoute("/onboarding/company")({
  loader: async () => {
    const onboarding = await getCompanyOnboarding();
    if (onboarding.kind === "redirect") throw redirect({ href: onboarding.to, replace: true });
    return onboarding;
  },
  gcTime: 0,
  component: CompanyOnboardingPage,
});

function CompanyOnboardingPage() {
  const { creedId } = Route.useLoaderData();
  return <CompanyOnboardingScreen creedId={creedId} />;
}
