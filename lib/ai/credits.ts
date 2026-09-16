import * as tables from "@/db/schema/application";
import type { DatabaseContext } from "@/lib/db/context";
import { maybeOne, query } from "@/lib/db/query";
import { and, eq, gte } from "drizzle-orm";
import "server-only";
// Credential resolution for AI calls. Two modes per Strap: the deployment's
// platform OpenRouter key (stored ai_mode "credits", surfaced as "Included" in
// the UI), or an encrypted BYOK key belonging to the user or company. Billing
// was removed from the product, so nothing meters or gates platform usage here
// anymore; creed_ai_usage still records every call for visibility.
import type { AiFeature } from "@/lib/ai/features";
import { getFeatureModelId } from "@/lib/ai/model-catalog";
import { readAiSettings, type AiMode } from "@/lib/ai/persistence";
import { serviceContext } from "@/lib/db/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { decryptSecret } from "@/lib/secret-crypto";

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

  const admin = serviceContext("lib/ai/credits.ts");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = (await query(admin, tables.creed_ai_usage, "select", (database, scope) => database.select({ estimated_cost_usd: tables.creed_ai_usage.estimated_cost_usd }).from(tables.creed_ai_usage).where(and(scope, eq(tables.creed_ai_usage.user_id, userId), eq(tables.creed_ai_usage.ai_mode, "credits"), gte(tables.creed_ai_usage.created_at, since))))) as {
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
  client: DatabaseContext,
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
  const admin = serviceContext("lib/ai/credits.ts");
  const { data } = await query(admin, tables.creed_company_ai_settings, "select", (database, scope) => database.select({ ai_mode: tables.creed_company_ai_settings.ai_mode, encrypted_openrouter_key: tables.creed_company_ai_settings.encrypted_openrouter_key, key_status: tables.creed_company_ai_settings.key_status }).from(tables.creed_company_ai_settings).where(and(scope, eq(tables.creed_company_ai_settings.creed_id, creedId)))).then(maybeOne);
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
