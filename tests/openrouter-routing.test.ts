import assert from "node:assert/strict";
import test from "node:test";
import { resolveOpenRouterProviderPreferences } from "../lib/ai/openrouter-routing.ts";

test("BYOK OpenAI models stay on the native OpenAI provider", () => {
  assert.deepEqual(
    resolveOpenRouterProviderPreferences({
      credentialMode: "byok",
      modelId: "openai/gpt-5",
      providerPreferences: { sort: "throughput", allow_fallbacks: true },
    }),
    {
      sort: "throughput",
      only: ["openai"],
      allow_fallbacks: false,
    },
  );
});

test("included OpenAI calls retain their configured provider routing", () => {
  const preferences = {
    order: ["cerebras", "groq"],
    allow_fallbacks: true,
    sort: "throughput",
  };

  assert.equal(
    resolveOpenRouterProviderPreferences({
      credentialMode: "credits",
      modelId: "openai/gpt-oss-120b",
      providerPreferences: preferences,
    }),
    preferences,
  );
});

test("custom non-OpenAI BYOK models retain their configured provider routing", () => {
  const preferences = { sort: "price" };

  assert.equal(
    resolveOpenRouterProviderPreferences({
      credentialMode: "byok",
      modelId: "mistralai/mistral-large",
      providerPreferences: preferences,
    }),
    preferences,
  );
});
