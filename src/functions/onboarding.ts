import { loadCompanyOnboarding, loadOnboardingProviders, loadOnboardingStage } from "@/lib/onboarding-gate";
import { createServerFn } from "@tanstack/react-start";

export const getOnboardingProviders = createServerFn({ method: "GET" }).handler(() => loadOnboardingProviders());
export const getOnboardingStage = createServerFn({ method: "GET" }).handler(() => loadOnboardingStage());
export const getCompanyOnboarding = createServerFn({ method: "GET" }).handler(() => loadCompanyOnboarding());
