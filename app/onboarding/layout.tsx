import type { ReactNode } from "react";
import { AuthedProviders } from "@/components/strap/authed-providers";

// Onboarding uses StrapProvider (the screen claims and previews a Strap), so it
// gets the same dynamic, user-state boundary as the app shell. It lives outside
// (strap-app) because it has no app chrome and no entitlement gate.
export const dynamic = "force-dynamic";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <AuthedProviders>{children}</AuthedProviders>;
}
