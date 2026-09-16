import { OnboardingScreen } from "@/components/strap/onboarding-screen";
import { isDatabaseConfigured } from "@/lib/env";
import { getRequestAuth, getRequestDatabaseContext } from "@/lib/request-auth";
import { loadStrapState } from "@/lib/strap-backend";
import { isDatabaseTableMissingError } from "@/lib/strap-backend-errors";
import { redirect } from "next/navigation";

// Onboarding lives outside the (strap-app) route group. Anyone signed in can
// run it (answer questions, build with their assistant via a copy-paste
// prompt, preview) and then go straight into the app. We pass one signal to
// the screen:
//   - initialStage: resume point. A composed Strap resumes on the preview; a
//     claimed-but-not-composed seed resumes on the prompt step; otherwise the
//     screen starts at step 0.
export default async function OnboardingPage() {
  let initialStage: "prompt" | "preview" | undefined;

  if (isDatabaseConfigured()) {
    const context = await getRequestDatabaseContext();
    const {
      data: { user },
    } = await getRequestAuth().then(({ user }) => ({ data: { user } }));

    if (!user) {
      redirect("/home");
    }

    // loadStrapState is cache()-wrapped, so this reuses the identical call the
    // root layout already made this request. "Composed" == any section last
    // edited by an agent; "hasPersistedCreed" means the seed was claimed.
    try {
      const result = await loadStrapState(context, user);
      const composed = result.state.sections.some(
        (section) => section.lastEditedType === "agent"
      );
      if (composed) {
        initialStage = "preview";
      } else if (result.hasPersistedCreed) {
        initialStage = "prompt";
      }
    } catch (error) {
      if (!isDatabaseTableMissingError(error)) {
        throw error;
      }
    }
  }

  return <OnboardingScreen initialStage={initialStage} />;
}
