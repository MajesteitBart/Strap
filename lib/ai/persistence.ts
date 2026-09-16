import * as tables from "@/db/schema/application";
import { normalizeFeature } from "@/lib/ai/features";
import type { AiModelQuality } from "@/lib/ai/model-catalog";
import { authorizeValues } from "@/lib/authz/policies";
import { conflictSet, maybeOne, query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import { encryptSecret } from "@/lib/secret-crypto";
import { and, asc, eq, gte } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import "server-only";

import type { DatabaseContext } from "@/lib/db/context";

const MICRO_PER_USD = 1_000_000;

// Which key pays for first-party AI. 'credits' runs on Strap's platform key and
// bills the user's prepaid balance; 'byok' runs on the user's own key at no
// markup. The toggle lives in Settings; default is 'credits'. The model itself
// is server-selected per feature and hidden from the user in both modes.
export type AiMode = "credits" | "byok";

type AiSettingsRow = {
  user_id: string;
  provider: "openrouter";
  encrypted_api_key: string | null;
  api_key_last_four: string | null;
  key_status: "missing" | "valid" | "invalid";
  ai_mode: AiMode;
  last_validated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicAiSettings = {
  provider: "openrouter";
  keyStatus: "missing" | "valid" | "invalid";
  aiMode: AiMode;
  keyLastFour?: string;
  lastValidatedAt?: string;
};

export type AiUsageRange = "7d" | "30d" | "90d";

// The spend chart is tagged by feature (Analysis today; Tab/CMD-K later), not by
// model, since the model is hidden. Costs are the amounts actually charged
// (marked-up in credits mode, at-cost in BYOK), summed from creed_ai_usage.
export type AiUsageSummary = {
  range: AiUsageRange;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byFeature: Array<{ feature: string; costUsd: number }>;
  days: Array<{
    date: string;
    segments: Array<{ feature: string; costUsd: number }>;
  }>;
};

export type OpenRouterBalance = {
  usageUsd: number;
  // null limit means an unlimited key (OpenRouter returns limit: null).
  limitUsd: number | null;
  remainingUsd: number | null;
};

function assertNoError(error: { message: string } | null, fallback: string) {
  if (error) {
    throw new Error(error.message || fallback);
  }
}

export function buildPublicAiSettings(row?: AiSettingsRow | null): PublicAiSettings {
  return {
    provider: "openrouter",
    keyStatus: row?.key_status ?? "missing",
    aiMode: row?.ai_mode ?? "credits",
    keyLastFour: row?.api_key_last_four ?? undefined,
    lastValidatedAt: row?.last_validated_at ?? undefined,
  };
}

export async function readAiSettings(client: DatabaseContext, userId: string) {
  const db = client;
  const { data, error } = await query(db, tables.creed_ai_settings, "select", (database, scope) => database.select().from(tables.creed_ai_settings).where(and(scope, eq(tables.creed_ai_settings.user_id, userId)))).then(maybeOne);

  assertNoError(error, "Could not load AI settings.");
  return (data as AiSettingsRow | null) ?? null;
}

export async function readPublicAiSettings(client: DatabaseContext, userId: string) {
  return buildPublicAiSettings(await readAiSettings(client, userId));
}

type CompanyAiSettingsRow = {
  ai_mode?: AiMode;
  key_status?: "missing" | "present";
  api_key_last_four?: string | null;
};

// The company equivalent of readPublicAiSettings, keyed by creed_id. The company
// table stores key_status as 'missing' | 'present'; map 'present' to 'valid' so
// the shared settings card renders identically to personal. Read via the admin
// client (company AI settings are owner-only under RLS).
export async function readCompanyPublicAiSettings(creedId: string): Promise<PublicAiSettings> {
  const admin = serviceContext("lib/ai/persistence.ts");
  const { data } = await query(admin, tables.creed_company_ai_settings, "select", (database, scope) => database.select({ ai_mode: tables.creed_company_ai_settings.ai_mode, key_status: tables.creed_company_ai_settings.key_status, api_key_last_four: tables.creed_company_ai_settings.api_key_last_four }).from(tables.creed_company_ai_settings).where(and(scope, eq(tables.creed_company_ai_settings.creed_id, creedId)))).then(maybeOne);
  const row = (data as CompanyAiSettingsRow | null) ?? null;
  return {
    provider: "openrouter",
    keyStatus: row?.key_status === "present" ? "valid" : "missing",
    aiMode: row?.ai_mode ?? "credits",
    keyLastFour: row?.api_key_last_four ?? undefined,
  };
}

export async function upsertAiSettings({
  client,
  userId,
  apiKey,
  clearApiKey,
  aiMode,
}: {
  client: DatabaseContext;
  userId: string;
  apiKey?: string;
  clearApiKey?: boolean;
  aiMode?: AiMode;
}) {
  const db = client;
  const existing = await readAiSettings(db, userId);
  const now = new Date().toISOString();
  const trimmedKey = apiKey?.trim();
  const nextMode: AiMode = aiMode ?? existing?.ai_mode ?? "credits";

  // No key-required guard here. This endpoint also handles the credits/byok
  // toggle, which involves no key. The "you need a key" check happens at
  // AI-call time (resolveAiCredential), and Save is disabled client-side when
  // the field is empty.
  if (trimmedKey) {
    await validateOpenRouterKey(trimmedKey);
  }

  const row = {
    user_id: userId,
    provider: "openrouter" as const,
    encrypted_api_key: clearApiKey
      ? null
      : trimmedKey
        ? encryptSecret(trimmedKey)
        : existing?.encrypted_api_key ?? null,
    api_key_last_four: clearApiKey
      ? null
      : trimmedKey
        ? trimmedKey.slice(-4)
        : existing?.api_key_last_four ?? null,
    // Preserve key_status on a mode-only save; only a new key flips it to valid
    // and a clear flips it to missing.
    key_status: clearApiKey
      ? ("missing" as const)
      : trimmedKey
        ? ("valid" as const)
        : existing?.key_status ?? ("missing" as const),
    ai_mode: nextMode,
    last_validated_at: now,
    updated_at: now,
    created_at: existing?.created_at ?? now,
  };

  const { error } = await query(db, tables.creed_ai_settings, "insert", async (database, scope) => {
    const values = row as typeof tables.creed_ai_settings.$inferInsert;
    await authorizeValues(db, tables.creed_ai_settings, "insert", values);
    return database.insert(tables.creed_ai_settings).values(values).onConflictDoUpdate({ target: [tables.creed_ai_settings.user_id], set: conflictSet(tables.creed_ai_settings, values), setWhere: scope });
  });

  assertNoError(error, "Could not save AI settings.");
  return buildPublicAiSettings(row);
}

// Read a BYOK user's live OpenRouter balance for the settings card. Throws on a
// bad/expired key so the caller can surface a clean error.
export async function fetchOpenRouterBalance(apiKey: string): Promise<OpenRouterBalance> {
  const response = await fetch("https://openrouter.ai/api/v1/key", {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("OpenRouter could not read that key");
  }

  const payload = (await response.json().catch(() => null)) as {
    data?: { usage?: number; limit?: number | null };
  } | null;

  const usageUsd = Number(payload?.data?.usage) || 0;
  const rawLimit = payload?.data?.limit;
  const limitUsd = typeof rawLimit === "number" ? rawLimit : null;
  const remainingUsd = limitUsd != null ? Math.max(0, limitUsd - usageUsd) : null;
  return { usageUsd, limitUsd, remainingUsd };
}

async function validateOpenRouterKey(apiKey: string) {
  // Reuse the balance fetch; it hits GET /api/v1/key and throws on a bad key.
  await fetchOpenRouterBalance(apiKey);
}

export async function recordAiUsage({
  client,
  userId,
  creedId,
  feature,
  modelId,
  modelQuality,
  inputTokens,
  outputTokens,
  costUsd,
  chargedMicroUsd,
  aiMode,
}: {
  client: DatabaseContext;
  userId: string;
  // The Strap the spend belongs to. Set to the Company Strap id for company AI
  // so the company spend chart (readCompanyAiUsageSummary) can attribute it;
  // left null for personal usage (read by user_id), preserving personal charts.
  creedId?: string | null;
  feature: string;
  modelId: string;
  modelQuality: AiModelQuality;
  inputTokens: number;
  outputTokens: number;
  // The real (at-cost) OpenRouter cost of the call.
  costUsd: number;
  // The amount actually charged, in micro-USD: marked-up in credits mode,
  // at-cost in BYOK. The spend chart sums this so it never re-prices on a
  // markup change.
  chargedMicroUsd: number;
  aiMode: AiMode;
}) {
  const db = client;
  const { error } = await query(db, tables.creed_ai_usage, "insert", async (database, _scope) => {
    const values = {
    id: `ai_${Date.now().toString(36)}_${randomBytes(5).toString("hex")}`,
    user_id: userId,
    creed_id: creedId ?? null,
    feature,
    provider: "openrouter",
    model_id: modelId,
    model_quality: modelQuality,
    ai_mode: aiMode,
    input_tokens: Math.max(0, Math.round(inputTokens)),
    output_tokens: Math.max(0, Math.round(outputTokens)),
    estimated_cost_usd: costUsd.toFixed(6),
    charged_micro_usd: Math.max(0, Math.round(chargedMicroUsd)),
    created_at: new Date().toISOString(),
  } as typeof tables.creed_ai_usage.$inferInsert;
    await authorizeValues(db, tables.creed_ai_usage, "insert", values);
    return database.insert(tables.creed_ai_usage).values(values);
  });

  assertNoError(error, "Could not record AI usage.");
}

export function getRangeStart(range: AiUsageRange) {
  const now = Date.now();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

type UsageRow = {
  feature: string;
  charged_micro_usd: number | string | null;
  estimated_cost_usd: number | string;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
};

export async function readAiUsageSummary(
  client: DatabaseContext,
  userId: string,
  range: AiUsageRange,
  mode: AiMode
) {
  const db = client;
  const { data, error } = await query(db, tables.creed_ai_usage, "select", (database, scope) => database.select({ feature: tables.creed_ai_usage.feature, charged_micro_usd: tables.creed_ai_usage.charged_micro_usd, estimated_cost_usd: tables.creed_ai_usage.estimated_cost_usd, input_tokens: tables.creed_ai_usage.input_tokens, output_tokens: tables.creed_ai_usage.output_tokens, created_at: tables.creed_ai_usage.created_at }).from(tables.creed_ai_usage).where(and(scope, eq(tables.creed_ai_usage.user_id, userId), eq(tables.creed_ai_usage.ai_mode, mode), gte(tables.creed_ai_usage.created_at, getRangeStart(range)))).orderBy(asc(tables.creed_ai_usage.created_at)));

  assertNoError(error, "Could not load AI usage.");
  return foldUsageRows((data as UsageRow[] | null) ?? [], range);
}

// The company spend chart, keyed by creed_id (company usage is stamped with the
// Company Strap id by recordAiUsage). Read via the admin client since company AI
// usage is visible to every member. Owner-only detail lives in the credit
// history ledger, not this aggregate chart. Mirrors the personal summary exactly
// so the same UsageCard renders it.
export async function readCompanyAiUsageSummary(
  creedId: string,
  range: AiUsageRange,
  mode: AiMode
) {
  const admin = serviceContext("lib/ai/persistence.ts");
  const { data, error } = await query(admin, tables.creed_ai_usage, "select", (database, scope) => database.select({ feature: tables.creed_ai_usage.feature, charged_micro_usd: tables.creed_ai_usage.charged_micro_usd, estimated_cost_usd: tables.creed_ai_usage.estimated_cost_usd, input_tokens: tables.creed_ai_usage.input_tokens, output_tokens: tables.creed_ai_usage.output_tokens, created_at: tables.creed_ai_usage.created_at }).from(tables.creed_ai_usage).where(and(scope, eq(tables.creed_ai_usage.creed_id, creedId), eq(tables.creed_ai_usage.ai_mode, mode), gte(tables.creed_ai_usage.created_at, getRangeStart(range)))).orderBy(asc(tables.creed_ai_usage.created_at)));

  assertNoError(error, "Could not load AI usage.");
  return foldUsageRows((data as UsageRow[] | null) ?? [], range);
}

function foldUsageRows(rows: UsageRow[], range: AiUsageRange): AiUsageSummary {
  const summary: AiUsageSummary = {
    range,
    totalCostUsd: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    byFeature: [],
    days: [],
  };
  const featureTotals = new Map<string, number>();
  // (date, feature) → cost, so the per-day tooltip can break down by feature.
  const dayTotals = new Map<string, Map<string, number>>();

  for (const row of rows) {
    // Prefer the charged amount (already marked-up in credits mode); fall back
    // to the at-cost value for any legacy row missing the column.
    const cost =
      row.charged_micro_usd != null
        ? (Number(row.charged_micro_usd) || 0) / MICRO_PER_USD
        : Number(row.estimated_cost_usd) || 0;
    // Fold legacy keys (e.g. "quality_analysis") onto the canonical feature so
    // the chart shows one series, not two.
    const feature = normalizeFeature(row.feature || "analysis");
    const date = row.created_at.slice(0, 10);

    summary.totalCostUsd += cost;
    summary.totalInputTokens += row.input_tokens ?? 0;
    summary.totalOutputTokens += row.output_tokens ?? 0;
    featureTotals.set(feature, (featureTotals.get(feature) ?? 0) + cost);

    if (!dayTotals.has(date)) {
      dayTotals.set(date, new Map());
    }
    const day = dayTotals.get(date) as Map<string, number>;
    day.set(feature, (day.get(feature) ?? 0) + cost);
  }

  summary.byFeature = Array.from(featureTotals.entries()).map(([feature, costUsd]) => ({
    feature,
    costUsd,
  }));
  summary.days = Array.from(dayTotals.entries()).map(([date, segments]) => ({
    date,
    segments: Array.from(segments.entries()).map(([feature, costUsd]) => ({
      feature,
      costUsd,
    })),
  }));

  return summary;
}
