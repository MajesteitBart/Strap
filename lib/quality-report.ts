import * as tables from "@/db/schema/application";
import { maybeOne, query } from "@/lib/db/query";
import {
  GOALS_SECTION_ID,
  IDENTITY_SECTION_ID,
  PREFERENCES_SECTION_ID,
  ROUTINES_SECTION_ID,
  WORK_SECTION_ID,
  type StrapSection,
} from "@/lib/strap-data";
import { and, desc, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import "server-only";

import type { DatabaseContext } from "@/lib/db/context";

// A short headline + a one-sentence detail. The headline shows in the
// collapsed quality popover; the detail expands on demand.
export type QualityNote = { title: string; detail: string };

export type StrapQualityReport = {
  contentHash: string;
  overall: {
    score: number;
    summary: string;
    tags: string[];
    strength: QualityNote | null;
    gap: QualityNote | null;
    // Legacy arrays - kept for backwards-compat consumers / fallback when the
    // model returns the previous shape.
    strengths: string[];
    gaps: string[];
    focus: string[];
  };
  sections: Array<{
    sectionId: string;
    sectionName: string;
    score: number;
    tags: string[];
    strength: QualityNote | null;
    gap: QualityNote | null;
    reasons: string[];
    strengths: string[];
    gaps: string[];
    missingContext: string[];
    focus: string;
  }>;
  generatedAt: string;
};

/** @deprecated Use StrapQualityReport. */
export type CreedQualityReport = StrapQualityReport;

// Controlled tag vocabulary. The AI only picks from this set so the UI can
// reliably colour-code every tag. Order matches narrative weight.
export const QUALITY_TAG_VOCAB = {
  green: [
    "Specific",
    "Concrete",
    "Actionable",
    "Durable",
    "Examples",
    "Current",
    "Tight",
  ],
  amber: ["Generic", "Thin", "Surface", "Wordy", "Drifty"],
  red: [
    "Bloated",
    "Vague",
    "Empty",
    "Context",
    "Stale",
    "Off-topic",
    "No examples",
    "Contradiction",
  ],
} as const;

const ALL_TAGS = new Set<string>([
  ...QUALITY_TAG_VOCAB.green,
  ...QUALITY_TAG_VOCAB.amber,
  ...QUALITY_TAG_VOCAB.red,
]);

const RED_TAGS = new Set<string>(QUALITY_TAG_VOCAB.red);
const AMBER_TAGS = new Set<string>(QUALITY_TAG_VOCAB.amber);

const QUALITY_HASH_IGNORED_KEYS = new Set([
  "lastEditedAt",
  "lastEditedBy",
  "lastEditedLabel",
  "lastEditedType",
  "revision",
]);

function assertNoError(error: { message: string } | null, fallback: string) {
  if (error) {
    throw new Error(error.message || fallback);
  }
}

export function hashStrapSections(sections: StrapSection[]) {
  return createHash("sha256")
    .update(
      JSON.stringify(sections, (key, value) =>
        QUALITY_HASH_IGNORED_KEYS.has(key) ? undefined : value,
      ),
    )
    .digest("hex");
}

export function hashStrapSection(section: StrapSection) {
  return createHash("sha256")
    .update(
      JSON.stringify(section, (key, value) =>
        QUALITY_HASH_IGNORED_KEYS.has(key) ? undefined : value,
      ),
    )
    .digest("hex");
}

export function hashStrapSectionsById(sections: StrapSection[]) {
  return Object.fromEntries(
    sections.map((section) => [section.id, hashStrapSection(section)]),
  );
}

/** @deprecated Use hashStrapSections. */
export const hashCreedSections = hashStrapSections;
/** @deprecated Use hashStrapSection. */
export const hashCreedSection = hashStrapSection;
/** @deprecated Use hashStrapSectionsById. */
export const hashCreedSectionsById = hashStrapSectionsById;

function clampScore(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
}

// The visible evidence (the tags, and whether a gap is named) pins the allowed
// score, so the number can never disagree with what the popover shows. A red
// tag means a best practice is broken; an amber tag or a named gap means
// something is still missing; nothing flagged and no gap means the section is
// genuinely complete and must land in the top band.
function evidenceRange(tags: string[], hasGap: boolean): [number, number] {
  const reds = tags.filter((tag) => RED_TAGS.has(tag)).length;
  const ambers = tags.filter((tag) => AMBER_TAGS.has(tag)).length;
  if (reds >= 2) return [0, 61];
  if (reds === 1) return [0, 77];
  if (ambers >= 1 || hasGap) return [0, 89];
  return [90, 100];
}

// Last-resort gap so a sub-90 section always tells the user what is costing it
// points. The rubric requires the model to supply a real, specific gap; this
// only fires if it flagged the section yet named no gap.
function fallbackGapFromTags(tags: string[]): QualityNote | null {
  const flagged =
    tags.find((tag) => RED_TAGS.has(tag)) ??
    tags.find((tag) => AMBER_TAGS.has(tag));
  if (!flagged) {
    return null;
  }
  return {
    title: "Held back",
    detail: `Flagged "${flagged}"; resolve that to lift the score.`,
  };
}

// The five always-on core sections. The overall score is computed from these
// (weighted) rather than asked of the model, so the headline can never drift
// from the section scores underneath it.
const CORE_SECTION_IDS = new Set<string>([
  IDENTITY_SECTION_ID,
  GOALS_SECTION_ID,
  WORK_SECTION_ID,
  PREFERENCES_SECTION_ID,
  ROUTINES_SECTION_ID,
]);

// Deterministic overall score: strong essentials are the floor, good extra
// context is the climb. A flawless core alone tops out around 90; rich,
// well-written non-core sections (optional or custom) lift it toward 100. Weak
// extras never drag the headline, so trying new context is never punished, and
// a hollow core caps the whole file. So 95-100 needs a strong core AND rich
// additional context.
function computeOverallScore(
  sections: Array<{ sectionId: string; score: number }>,
) {
  if (!sections.length) {
    return 0;
  }

  const coreScores = sections
    .filter((section) => CORE_SECTION_IDS.has(section.sectionId))
    .map((section) => section.score);
  if (!coreScores.length) {
    // No core sections present (unusual): fall back to a plain average.
    return clampScore(
      sections.reduce((sum, section) => sum + section.score, 0) /
        sections.length,
    );
  }

  const coreAvg =
    coreScores.reduce((sum, value) => sum + value, 0) / coreScores.length;
  if (Math.min(...coreScores) < 40) {
    return clampScore(Math.min(coreAvg, 70));
  }

  const base = Math.min(coreAvg, 90);
  const extras = sections.filter(
    (section) =>
      !CORE_SECTION_IDS.has(section.sectionId) && section.score >= 70,
  );
  const lift = Math.min(
    10,
    extras.reduce((sum, section) => sum + (section.score - 70) / 30, 0) * 4,
  );
  return clampScore(base + lift);
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 6);

  return items.length ? items : fallback;
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!ALL_TAGS.has(trimmed) || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= 3) break;
  }
  return out;
}

function normalizeNote(
  value: unknown,
  fallbackTitle?: string,
): QualityNote | null {
  // Accept either the new {title, detail} shape, the array fallback (first
  // string with sane heuristics), or null/undefined.
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const title = typeof obj.title === "string" ? obj.title.trim() : "";
    const detail = typeof obj.detail === "string" ? obj.detail.trim() : "";
    if (title && detail) {
      return {
        title: title.slice(0, 60),
        detail: detail.slice(0, 240),
      };
    }
    if (title) {
      return { title: title.slice(0, 60), detail: title };
    }
    if (detail) {
      return {
        title: fallbackTitle ?? detail.split(/[.,;:]/)[0].slice(0, 60),
        detail: detail.slice(0, 240),
      };
    }
  }

  if (typeof value === "string" && value.trim()) {
    const text = value.trim();
    return {
      title: fallbackTitle ?? text.split(/[.,;:]/)[0].slice(0, 60),
      detail: text.slice(0, 240),
    };
  }

  return null;
}

function deriveLegacyNote(
  items: string[] | undefined,
  fallbackTitle: string,
): QualityNote | null {
  if (!items || !items.length) return null;
  const detail = items[0];
  return {
    title: fallbackTitle,
    detail: detail.slice(0, 240),
  };
}

type SectionReport = StrapQualityReport["sections"][number];

// The whole-file qualitative judgment (everything on `overall` except the
// computed score). Shared by the model-parse path and the carry-forward path.
type OverallQualitative = {
  summary: string;
  tags: string[];
  strength: QualityNote | null;
  gap: QualityNote | null;
  strengths: string[];
  gaps: string[];
};

// Normalize one section's raw model/stored payload into a section report.
// `raw === undefined` (a section the model skipped, or one with no stored
// entry) yields a neutral fallback the caller can choose to override with a
// carried-forward score instead of showing a phantom zero.
function normalizeSectionReport(
  raw: Record<string, unknown> | undefined,
  section: StrapSection,
): SectionReport {
  const strengths = normalizeStringArray(raw?.strengths, []).slice(0, 3);
  const gaps = normalizeStringArray(
    raw?.gaps,
    raw?.missingContext ? normalizeStringArray(raw.missingContext, []) : [],
  ).slice(0, 3);

  const tags = normalizeTags(raw?.tags);
  const strength =
    normalizeNote(raw?.strength) ??
    deriveLegacyNote(strengths, "Worth keeping");
  let gap = normalizeNote(raw?.gap) ?? deriveLegacyNote(gaps, "Needs work");

  // The evidence decides the band; the model's number only places it within.
  const [lo, hi] = evidenceRange(tags, gap !== null);
  const score = Math.max(lo, Math.min(hi, clampScore(raw?.score ?? 0)));

  // Gap is mandatory below 90. If the model flagged the section but named no
  // gap, surface one from the flag so the popover always explains the score.
  if (!gap && score < 90) {
    gap = fallbackGapFromTags(tags);
  }

  return {
    sectionId: section.id,
    sectionName: section.name,
    score,
    tags,
    strength,
    gap,
    reasons: normalizeStringArray(raw?.reasons, [
      "Needs a clearer signal that helps future AI know you.",
    ]).slice(0, 3),
    strengths,
    gaps,
    missingContext: normalizeStringArray(raw?.missingContext, []).slice(0, 3),
    focus:
      typeof raw?.focus === "string" && raw.focus.trim()
        ? raw.focus.trim()
        : "Make this section more specific, current, and grounded in concrete details about you.",
  };
}

function parseOverallQualitative(value: unknown): OverallQualitative {
  const overall =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const strengths = normalizeStringArray(overall.strengths, []).slice(0, 4);
  const gaps = normalizeStringArray(overall.gaps, []).slice(0, 4);

  return {
    summary:
      typeof overall.summary === "string" && overall.summary.trim()
        ? overall.summary.trim()
        : "The profile has useful structure but needs sharper, more specific personal context.",
    tags: normalizeTags(overall.tags),
    strength:
      normalizeNote(overall.strength) ??
      deriveLegacyNote(strengths, "Working well"),
    gap: normalizeNote(overall.gap) ?? deriveLegacyNote(gaps, "Biggest gap"),
    strengths,
    gaps,
  };
}

// Validate a stored (full-shape) report against the current sections. Used when
// reading a persisted report (cache hit, baseline read, the MCP read path). The
// model-response path uses `normalizeSectionReport` + `assembleReport` instead.
export function validateQualityReport(
  value: unknown,
  sections: StrapSection[],
  contentHash: string,
  // A company report is one shared report, generated over ALL sections and keyed
  // by creed_id, but each member reads it scoped to the sections they can see.
  // For a company read we must show the SAME thing to everyone: the stored shared
  // overall score (not one recomputed over the reader's visible subset, which
  // would differ per member) and the full shared narrative (score + tags +
  // strengths + gaps), so a member sees the identical headline and description as
  // the owner. Personal reads (companyRead=false) recompute the score from the
  // owner's own sections, which they always see in full - byte-identical to before.
  companyRead = false,
): StrapQualityReport {
  const root =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const rawOverall =
    root.overall && typeof root.overall === "object"
      ? (root.overall as Record<string, unknown>)
      : {};
  const rawSections = Array.isArray(root.sections) ? root.sections : [];

  const sectionReports = sections.map((section) =>
    normalizeSectionReport(findRawSection(rawSections, section.id), section),
  );
  const overall = parseOverallQualitative(rawOverall);

  // The shared score written by the run/merge path (computeOverallScore over the
  // full file). Used verbatim for company reads so every member sees one true
  // number; falls back to a recompute if an old row has no stored score.
  const storedScore =
    typeof rawOverall.score === "number" && Number.isFinite(rawOverall.score)
      ? rawOverall.score
      : null;

  return {
    contentHash,
    overall: {
      score:
        companyRead && storedScore !== null
          ? storedScore
          : computeOverallScore(sectionReports),
      summary: overall.summary,
      tags: overall.tags,
      strength: overall.strength,
      gap: overall.gap,
      strengths: overall.strengths,
      gaps: overall.gaps,
      focus: normalizeStringArray(
        rawOverall.focus,
        overall.gap ? [overall.gap.detail] : [],
      ).slice(0, 5),
    },
    sections: sectionReports,
    generatedAt: new Date().toISOString(),
  };
}

function findRawSection(rawSections: unknown[], sectionId: string) {
  return rawSections.find(
    (item) =>
      item &&
      typeof item === "object" &&
      (item as Record<string, unknown>).sectionId === sectionId,
  ) as Record<string, unknown> | undefined;
}

export async function readLatestQualityReport(
  client: DatabaseContext,
  userId: string,
  creedId?: string,
) {
  const db = client;
  const { data, error } = await query(
    db,
    tables.creed_quality_reports,
    "select",
    (database, scope) =>
      database
        .select()
        .from(tables.creed_quality_reports)
        .where(
          and(
            scope,
            creedId
              ? eq(tables.creed_quality_reports.creed_id, creedId)
              : eq(tables.creed_quality_reports.user_id, userId),
          ),
        )
        .orderBy(desc(tables.creed_quality_reports.updated_at))
        .limit(1),
  ).then(maybeOne);

  assertNoError(error, "Could not load quality report.");
  return data as {
    content_hash?: string;
    model_id?: string;
    section_hashes?: unknown;
    report?: unknown;
    updated_at?: string;
  } | null;
}
