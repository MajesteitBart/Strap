import {
  CONSTRAINTS_SECTION_ID,
  CONTEXT_SECTION_ID,
  GOALS_SECTION_ID,
  IDENTITY_SECTION_ID,
  PEOPLE_SECTION_ID,
  PREFERENCES_SECTION_ID,
  ROUTINES_SECTION_ID,
  WORK_SECTION_ID,
  type StrapSection,
  type OnboardingState,
} from "../strap-data.ts";
import { escapeHtml } from "../rich-text.ts";

// Onboarding compiles three open answers into a deterministic seed: the five
// always-on core sections. Identity, Goals, and Preferences carry the user's
// words; Work and Routines ship as light stubs the user's own assistant fleshes
// out from the copy-paste compose prompt (which also has the user's history).
// Optional sections (Beliefs, Constraints, People, Health, Context) are not
// seeded here - they grow in-app via agent proposals once connected.

// Stubs are gentle prompts. Identity / Goals / Preferences only fall back to one
// if the user skipped the question; Work and Routines always start as a stub
// because no question feeds them directly.
const IDENTITY_STUB =
  "Add who you are, what you do, and the tools you work in.";
const GOALS_STUB =
  "Add a goal or project AI should know you are working toward.";
const WORK_STUB =
  "Add how you like to work, your process and the people you collaborate with.";
const PREFERENCES_STUB = "Lead with the answer. Skip filler and over-praise.";
const ROUTINES_STUB =
  "Add a daily, weekly, or seasonal rhythm AI should respect.";

export type OnboardingPreviewDraft = {
  identityText: string;
  goalsText: string;
  preferences: string[];
};

function normalizeWhitespace(value: string) {
  return value
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanInline(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bi\b/g, "I")
    .replace(/\bim\b/gi, "I'm")
    .replace(/\bidk\b/gi, "I don't know")
    .replace(/\bu\b/gi, "you")
    .replace(/\bur\b/gi, "your")
    .replace(/\bai\b/gi, "AI")
    .replace(/\bllm\b/gi, "LLM")
    .replace(/\bgithub\b/gi, "GitHub");
}

function toRuleSentence(value: string) {
  const cleaned = cleanInline(value).replace(/[.;:,]+$/, "");
  if (!cleaned) return "";
  const cased = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return cased.endsWith(".") ? cased : `${cased}.`;
}

function dedupe(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Split a free-form answer into rule-shaped lines: respects the user's own line
// breaks first, then falls back to sentence boundaries on a single line.
function toRuleLines(value: string, limit: number) {
  const cleaned = normalizeWhitespace(value);
  if (!cleaned) return [];
  const rawLines = cleaned.split(/\n+/).filter(Boolean);
  const pieces =
    rawLines.length > 1 ? rawLines : cleaned.split(/(?<=[.!?])\s+/);
  return dedupe(pieces.map(toRuleSentence).filter(Boolean)).slice(0, limit);
}

export function compileOnboardingDraft(
  onboarding: OnboardingState,
): OnboardingPreviewDraft {
  const identityText =
    normalizeWhitespace(onboarding.identity) || IDENTITY_STUB;
  const goalsText = normalizeWhitespace(onboarding.goals) || GOALS_STUB;
  const preferences = toRuleLines(onboarding.preferences, 6);

  return {
    identityText,
    goalsText,
    preferences: preferences.length > 0 ? preferences : [PREFERENCES_STUB],
  };
}

// ──────────────────────────────────────────────────────────────────
// Section emit
// ──────────────────────────────────────────────────────────────────

export function makeSection(
  partial: Pick<StrapSection, "id" | "name" | "accent" | "content"> & {
    template?: StrapSection["template"];
    loading?: StrapSection["loading"];
  },
): StrapSection {
  return {
    id: partial.id,
    kind: "rich-text",
    template: partial.template ?? "freeform",
    name: partial.name,
    accent: partial.accent,
    content: partial.content,
    // Every starter section is agent-writable so AI can keep the profile
    // accurate, polished, concise, and current.
    agentWritable: true,
    agentPermission: "propose",
    lastEditedBy: "You",
    lastEditedType: "user",
    lastEditedLabel: "just now",
    ...(partial.loading === "on-demand" ? { loading: "on-demand" as const } : {}),
  };
}

function paragraphContent(text: string) {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => normalizeWhitespace(block).replace(/\n+/g, " "))
    .filter(Boolean);
  if (blocks.length === 0) return "";
  return blocks.map((block) => `<p>${escapeHtml(block)}</p>`).join("");
}

function bulletList(items: string[]) {
  if (!items.length) return "";
  return `<ul class="creed-list creed-list-bullet">${items
    .map((text) => `<li>${escapeHtml(text)}</li>`)
    .join("")}</ul>`;
}

export function buildOnboardingPreviewSections(
  draft: OnboardingPreviewDraft,
): StrapSection[] {
  return [
    makeSection({
      id: IDENTITY_SECTION_ID,
      name: "Identity",
      accent: "identity",
      template: "identity",
      content: `${paragraphContent(draft.identityText) || `<p>${escapeHtml(draft.identityText)}</p>`}`,
    }),
    makeSection({
      id: GOALS_SECTION_ID,
      name: "Goals",
      accent: "projects",
      template: "focus",
      content: `${paragraphContent(draft.goalsText) || `<p>${escapeHtml(draft.goalsText)}</p>`}`,
    }),
    makeSection({
      id: WORK_SECTION_ID,
      name: "Work",
      accent: "tools",
      template: "freeform",
      content: `${paragraphContent(WORK_STUB)}`,
    }),
    makeSection({
      id: PREFERENCES_SECTION_ID,
      name: "Preferences",
      accent: "preferences",
      template: "principles",
      content: `${bulletList(draft.preferences)}`,
    }),
    makeSection({
      id: ROUTINES_SECTION_ID,
      name: "Routines",
      accent: "workflows",
      template: "principles",
      content: `${bulletList([ROUTINES_STUB])}`,
      // Routines matter for scheduling, not for every reply.
      loading: "on-demand",
    }),
  ];
}

// Optional sections a pasted Strap may add when the onboarding interview
// surfaced something for them. Onboarding never seeds these empty: an empty
// section would still load into every prompt.
export const COMPOSE_OPTIONAL_SECTIONS = [
  { id: CONSTRAINTS_SECTION_ID, name: "Constraints", accent: "boundaries", template: "principles" },
  { id: CONTEXT_SECTION_ID, name: "Context", accent: "tools", template: "freeform" },
  { id: PEOPLE_SECTION_ID, name: "People", accent: "rose", template: "freeform", loading: "on-demand" },
] as const satisfies ReadonlyArray<{
  id: string;
  name: string;
  accent: StrapSection["accent"];
  template: StrapSection["template"];
  loading?: StrapSection["loading"];
}>;

/**
 * Maps the sections parsed from a pasted Strap onto the seed. Seed sections
 * keep their id, name and accent and take the pasted body; the optional
 * sections above are appended when the paste has content for them; anything
 * else is ignored. Parsed content must already be normalized HTML.
 */
export function mergeComposedSections(
  seed: StrapSection[],
  parsed: ReadonlyArray<{ id: string; content: string }>,
  isEmpty: (content: string) => boolean,
): { sections: StrapSection[]; matched: number } {
  const parsedById = new Map<string, string>();
  for (const section of parsed) {
    if (!isEmpty(section.content)) parsedById.set(section.id, section.content);
  }
  const composed = (section: StrapSection, content: string): StrapSection => ({
    ...section,
    content,
    // Stays "propose": ongoing edits need approval; this paste is the one
    // allowed initialize. Marked agent-authored so resume/composed detection
    // treats the Strap as composed.
    lastEditedBy: "Your assistant",
    lastEditedType: "agent",
    lastEditedLabel: "just now",
  });

  let matched = 0;
  const sections = seed.map((section) => {
    const content = parsedById.get(section.id);
    if (!content || content === section.content) return section;
    matched += 1;
    return composed(section, content);
  });
  const existing = new Set(sections.map((section) => section.id));
  for (const optional of COMPOSE_OPTIONAL_SECTIONS) {
    const content = parsedById.get(optional.id);
    if (!content || existing.has(optional.id)) continue;
    matched += 1;
    sections.push(composed(makeSection({ ...optional, content }), content));
  }
  return { sections, matched };
}
