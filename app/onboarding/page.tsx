import { redirect } from "next/navigation";
import { OnboardingScreen } from "@/components/strap/onboarding-screen";
import { loadStrapState } from "@/lib/strap-backend";
import { isSupabaseTableMissingError } from "@/lib/strap-backend-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Onboarding lives outside the (strap-app) route group. Anyone signed in can
// run it (answer questions, build with their assistant via a copy-paste
// prompt, preview) and then go straight into the app. We pass one signal to
// the screen:
//   - initialStage: resume point. A composed Strap resumes on the preview; a
//     claimed-but-not-composed seed resumes on the prompt step; otherwise the
//     screen starts at step 0.
export default async function OnboardingPage() {
  let initialStage: "prompt" | "preview" | undefined;

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/home");
    }

    // loadStrapState is cache()-wrapped, so this reuses the identical call the
    // root layout already made this request. "Composed" == any section last
    // edited by an agent; "hasPersistedCreed" means the seed was claimed.
    try {
      const result = await loadStrapState(supabase, user);
      const composed = result.state.sections.some(
        (section) => section.lastEditedType === "agent"
      );
      if (composed) {
        initialStage = "preview";
      } else if (result.hasPersistedCreed) {
        initialStage = "prompt";
      }
    } catch (error) {
      if (!isSupabaseTableMissingError(error)) {
        throw error;
      }
    }
  }

  return <OnboardingScreen initialStage={initialStage} />;
}
