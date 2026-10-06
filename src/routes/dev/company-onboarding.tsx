import { CompanyOnboardingScreen } from "@/components/strap/company-onboarding-screen";
import { createFileRoute, notFound } from "@tanstack/react-router";

// Development-only preview of the company onboarding flow.
export const Route = createFileRoute("/dev/company-onboarding")({
  loader: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: CompanyOnboardingPreviewPage,
});

function CompanyOnboardingPreviewPage() {
  return <CompanyOnboardingScreen creedId="dev-company-onboarding-preview" previewMode />;
}
