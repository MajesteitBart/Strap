export type OpenRouterProviderPreferences = Record<string, unknown>;

// OpenRouter can serve OpenAI-authored models through multiple upstreams (for
// example OpenAI and Azure). An OpenRouter account that brings its own OpenAI
// provider key must stay on the native OpenAI route; otherwise a fallback can
// spend OpenRouter credits and incorrectly surface a 402 despite the provider
// key being funded.
export function resolveOpenRouterProviderPreferences({
  credentialMode,
  modelId,
  providerPreferences,
}: {
  credentialMode?: "credits" | "byok";
  modelId: string;
  providerPreferences?: OpenRouterProviderPreferences;
}): OpenRouterProviderPreferences | undefined {
  if (credentialMode !== "byok" || !modelId.startsWith("openai/")) {
    return providerPreferences;
  }

  return {
    ...providerPreferences,
    only: ["openai"],
    allow_fallbacks: false,
  };
}
