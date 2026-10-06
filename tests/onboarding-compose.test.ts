// Onboarding seeds, the guided compose prompt and the paste merge.
//
//   node --test --experimental-strip-types tests/onboarding-compose.test.ts

import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  buildOnboardingPreviewSections,
  makeSection,
  mergeComposedSections,
  type OnboardingPreviewDraft,
} from "../lib/onboarding/compile.ts";
import {
  buildCompanyOnboardingSections,
  EMPTY_COMPANY_ONBOARDING,
} from "../lib/onboarding/compile-company.ts";
import { buildComposePrompt, STRAP_PROMPTS, STRAP_WORD_BUDGET } from "../lib/strap-prompts.ts";

const PERSONAL_DRAFT: OnboardingPreviewDraft = {
  identityText: "I build small products with AI.",
  goalsText: "Ship Strap.",
  preferences: ["Lead with the answer."],
};

test("seeds carry no Graph Tags subsections", () => {
  const personal = buildOnboardingPreviewSections(PERSONAL_DRAFT);
  const company = buildCompanyOnboardingSections({
    ...EMPTY_COMPANY_ONBOARDING,
    whatItDoes: "We build agent tooling.",
  });
  for (const section of [...personal, ...company]) {
    assert.doesNotMatch(section.content, /Graph Tags/, `${section.id} should not seed Graph Tags`);
    assert.doesNotMatch(section.content, /creed-inline-tag/, `${section.id} should not seed tag chips`);
  }
});

test("the compose prompt runs a short guided interview within a word budget", () => {
  const prompt = buildComposePrompt(buildOnboardingPreviewSections(PERSONAL_DRAFT));
  assert.match(prompt, /Ask one question per message/);
  assert.match(prompt, /numbered 1, 2, 3/);
  assert.match(prompt, /at most eight questions/);
  assert.match(prompt, /"draft now"/);
  assert.match(prompt, new RegExp(`under ${STRAP_WORD_BUDGET} words`));
  assert.match(prompt, /first person, as preferences/);
  assert.doesNotMatch(prompt, /Graph Tags/);
  assert.doesNotMatch(prompt, /full Strap/);
  assert.doesNotMatch(prompt, /—/, "product copy has no em dashes");
});

test("the compose prompt lists the seed headings, then the optional ones", () => {
  const prompt = buildComposePrompt(buildOnboardingPreviewSections(PERSONAL_DRAFT));
  const headings = [...prompt.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  const listed = headings.slice(0, 8);
  assert.deepEqual(listed, ["Identity", "Goals", "Work", "Preferences", "Routines", "Constraints", "Context", "People"]);
});

test("pasted sections map onto the seed and add filled optional sections only", () => {
  const seed = buildOnboardingPreviewSections(PERSONAL_DRAFT);
  const isEmpty = (content: string) => !content.replace(/<[^>]*>/g, "").trim();
  const { sections, matched } = mergeComposedSections(
    seed,
    [
      { id: "identity", content: "<p>I'm Bart.</p>" },
      { id: "constraints", content: "<ul><li>Ask before publishing.</li></ul>" },
      { id: "people", content: "<p></p>" },
      { id: "random-notes", content: "<p>ignored</p>" },
    ],
    isEmpty,
  );
  assert.equal(matched, 2);
  assert.deepEqual(sections.map((section) => section.id), ["identity", "goals", "work", "preferences", "routines", "constraints"]);
  const constraints = sections.find((section) => section.id === "constraints")!;
  assert.equal(constraints.name, "Constraints");
  assert.equal(constraints.agentPermission, "propose");
  assert.equal(constraints.lastEditedType, "agent");
  assert.equal(sections.find((section) => section.id === "goals")!.lastEditedType, "user");
  assert.equal(constraints.loading, undefined, "constraints load with every request");
});

test("routines and people default to on-demand loading", () => {
  const seed = buildOnboardingPreviewSections(PERSONAL_DRAFT);
  assert.equal(seed.find((section) => section.id === "routines")!.loading, "on-demand");
  assert.equal(seed.find((section) => section.id === "identity")!.loading, undefined);
  const { sections } = mergeComposedSections(seed, [{ id: "people", content: "<p>Maaike, my wife.</p>" }], () => false);
  assert.equal(sections.find((section) => section.id === "people")!.loading, "on-demand");
});

test("an optional section that already exists is not duplicated", () => {
  const seed = [
    ...buildOnboardingPreviewSections(PERSONAL_DRAFT),
    makeSection({ id: "context", name: "Context", accent: "tools", content: "<p>old</p>" }),
  ];
  const { sections } = mergeComposedSections(seed, [{ id: "context", content: "<p>new</p>" }], () => false);
  assert.equal(sections.filter((section) => section.id === "context").length, 1);
  assert.equal(sections.find((section) => section.id === "context")!.content, "<p>new</p>");
});

test("connected agents can run the same interview over MCP", () => {
  const prompt = STRAP_PROMPTS.find((entry) => entry.name === "interview-me");
  assert.ok(prompt, "interview-me prompt is registered");
  assert.match(prompt.text, /read_strap/);
  assert.match(prompt.text, /one question per message/i);
  assert.match(prompt.text, /strap_\* tools/);
});
