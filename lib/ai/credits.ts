import "server-only";
// Credential resolution for AI calls. Two modes per Creed: the deployment's
// platform OpenRouter key (stored ai_mode "credits", surfaced as "Included" in
// the UI), or an encrypted BYOK key belonging to the user or company. Billing
// was removed from the product, so nothing meters or gates platform usage here
// anymore; creed_ai_usage still records every call for visibility.
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseLikeClient } from "@/lib/supabase/types";
import { getFeatureModelId } from "@/lib/ai/model-catalog";
import type { AiFeature } from "@/lib/ai/features";
import { readAiSettings, type AiMode } from "@/lib/ai/persistence";
import { decryptSecret } from "@/lib/secret-crypto";
import { checkRateLimit } from "@/lib/rate-limit";

const INCLUDED_AI_BURST_LIMIT = 20;
const INCLUDED_AI_BURST_WINDOW_MS = 60_000;
const DEFAULT_INCLUDED_AI_DAILY_LIMIT_USD = 0.5;

export type ResolvedAiCredential = {
  apiKey: string;
  modelId: string;
  mode: AiMode;
};

export function getOpenRouterPlatformKey(): string {
  const value = process.env.OPENROUTER_PLATFORM_KEY?.trim();
  if (!value) {
    // This deployment ships no platform key; BYOK is the way in.
    throw new Error("Included AI isn't configured. Add an OpenRouter key in Settings.");
  }
  return value;
}

function getIncludedAiDailyLimitUsd() {
  const configured = Number(process.env.INCLUDED_AI_DAILY_LIMIT_USD);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_INCLUDED_AI_DAILY_LIMIT_USD;
}

async function assertIncludedAiQuota(userId: string) {
  const burst = checkRateLimit({
    scope: "included-ai",
    identifier: userId,
    limit: INCLUDED_AI_BURST_LIMIT,
    windowMs: INCLUDED_AI_BURST_WINDOW_MS,
  });
  if (!burst.ok) {
    throw new Error("Included AI is busy. Try again in a minute or use your OpenRouter key.");
  }

  const admin = getSupabaseAdminClient() as unknown as SupabaseLikeClient;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = (await admin
    .from("creed_ai_usage")
    .select("estimated_cost_usd")
    .eq("user_id", userId)
    .eq("ai_mode", "credits")
    .gte("created_at", since)) as {
    data: Array<{ estimated_cost_usd: number | string }> | null;
    error: { message: string } | null;
  };

  if (error) {
    throw new Error("Included AI is temporarily unavailable.");
  }

  const spentUsd = (data ?? []).reduce(
    (total, row) => total + (Number(row.estimated_cost_usd) || 0),
    0,
  );
  if (spentUsd >= getIncludedAiDailyLimitUsd()) {
    throw new Error("Included AI's daily limit is reached. Use your OpenRouter key or try tomorrow.");
  }
}

// Pick the key + model for a personal AI call based on the user's ai_mode. The
// model is server-selected per feature (hidden from the user) in BOTH modes.
// BYOK resolves through the BYOK model table because bring-your-own keys are
// often provider-restricted and can't route to the platform defaults.
export async function resolveAiCredential(
  client: unknown,
  userId: string,
  feature: AiFeature
): Promise<ResolvedAiCredential> {
  const row = await readAiSettings(client, userId);
  const mode: AiMode = row?.ai_mode === "byok" ? "byok" : "credits";

  if (mode === "byok") {
    const encryptedKey = row?.encrypted_api_key;
    if (!encryptedKey || row?.key_status !== "valid") {
      throw new Error("Add an OpenRouter key in Settings");
    }
    return {
      apiKey: decryptSecret(encryptedKey),
      modelId: getFeatureModelId(feature, { byok: true }),
      mode: "byok",
    };
  }

  await assertIncludedAiQuota(userId);

  return {
    apiKey: getOpenRouterPlatformKey(),
    modelId: getFeatureModelId(feature),
    mode: "credits",
  };
}

type CompanyAiSettingsRow = {
  ai_mode?: string;
  encrypted_openrouter_key?: string | null;
  key_status?: string;
};

// Company equivalent: the owner-set company BYOK key, or the platform key.
// Read via the admin client (company AI settings are owner-only under RLS; the
// calling route has already authorized membership).
export async function resolveCompanyAiCredential(
  creedId: string,
  feature: AiFeature,
  userId: string,
): Promise<ResolvedAiCredential> {
  const admin = getSupabaseAdminClient() as unknown as SupabaseLikeClient;
  const { data } = await admin
    .from("creed_company_ai_settings")
    .select("ai_mode, encrypted_openrouter_key, key_status")
    .eq("creed_id", creedId)
    .maybeSingle();
  const settings = data as CompanyAiSettingsRow | null;

  if (settings?.ai_mode === "byok") {
    if (!settings.encrypted_openrouter_key || settings.key_status !== "present") {
      throw new Error("Ask your owner to add a company OpenRouter key");
    }
    return {
      apiKey: decryptSecret(settings.encrypted_openrouter_key),
      modelId: getFeatureModelId(feature, { byok: true }),
      mode: "byok",
    };
  }

  await assertIncludedAiQuota(userId);

  return {
    apiKey: getOpenRouterPlatformKey(),
    modelId: getFeatureModelId(feature),
    mode: "credits",
  };
}
