import { OnboardingScreen } from "@/components/strap/onboarding-screen";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getOnboardingStage } from "../../functions/onboarding";

// Anyone signed in can run onboarding (answer questions, build with their
// assistant via a copy-paste prompt, preview) and then go straight into the
// app. The screen resumes where the user left off.
export const Route = createFileRoute("/onboarding/")({
  loader: async () => {
    const stage = await getOnboardingStage();
    if (stage.kind === "redirect") throw redirect({ href: stage.to, replace: true });
    return stage;
  },
  gcTime: 0,
  component: OnboardingPage,
});

function OnboardingPage() {
  const { initialStage } = Route.useLoaderData();
  return <OnboardingScreen initialStage={initialStage} />;
}
