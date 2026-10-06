import { COMPOSE_OPTIONAL_SECTIONS } from "./onboarding/compile.ts";
import { sectionToMarkdown, STRAP_WORD_BUDGET, type StrapSection } from "./strap-data.ts";

export { STRAP_WORD_BUDGET };

// What a Strap holds, in interview order. Shared by the onboarding copy prompt
// and the interview-me MCP prompt so both ask about the same things.
const INTERVIEW_TOPICS = [
  "Who I am and what I do, in a sentence or two.",
  "What I'm working toward in the next three to six months.",
  "How an AI should handle work I hand over: take it and come back when it's done, check in at milestones, or plan first and wait for my approval.",
  "What counts as done, and what proof I expect.",
  "When an AI must stop and ask first, for example anything public, anything that costs money, deleting or overwriting, messages to other people, or anything outside the agreed scope.",
  "How I want answers and reports: language, length, tone, and what to always include.",
  "Hard lines: privacy, clients, accounts, and things an AI must never do.",
  "Where my tasks, notes, files and secrets live, and which people an AI should know about.",
];

const INTERVIEW_RULES = [
  "Start from what you already know about me. Don't ask about things you already know; ask only about what is missing, vague or contradictory.",
  "Ask one question per message, then wait for my answer.",
  "Offer two to four concrete answer options numbered 1, 2, 3, based on what you know about me, and say I can also write my own answer. I may reply with just a number.",
  "Ask at most eight questions and stop sooner when you have enough. If I say \"skip\", move on. If I say \"draft now\", write it straight away.",
];

const WRITING_RULES = [
  "Include only what changes how an AI should help me in most conversations and will still be true in a month. Leave out task details, project status, tool settings, step-by-step procedures and anything an AI can look up.",
  "Write in the first person, as preferences with the reason when it isn't obvious (\"I don't watch threads, so...\"), not as commands. Use plain, specific sentences. No filler, praise or hashtags.",
  "Describe how to help me, not opinions to agree with.",
  "Give goals an \"as of\" month.",
  `Keep the whole Strap under ${STRAP_WORD_BUDGET} words. Shorter is better.`,
];

const numbered = (items: readonly string[]) => items.map((item, index) => `${index + 1}. ${item}`);
const bulleted = (items: readonly string[]) => items.map((item) => `- ${item}`);

// The prompts Strap exposes over MCP (prompts/list + prompts/get). The in-app
// onboarding "copy prompt" is built per-user by buildComposePrompt below.
export const STRAP_PROMPTS = [
  {
    name: "use-shared-skills",
    description: "Read my shared skill library and prepare to use relevant workflows.",
    text: "Read my Strap with read_strap, then call strap_list_skills. Summarize the available workflows briefly and read relevant skills with strap_get_skill before using them. Fetch supporting files only when needed. Do not execute scripts, install dependencies, reveal keys, or publish changed skills without my request. Keep my profile and connection permissions in effect.",
  },
  {
    name: "introduce-me",
    description:
      "Read my Strap and introduce me the way a sharp collaborator would.",
    text: "Read my Strap with read_strap, then introduce me in a few tight sentences the way a sharp new collaborator would after reading my profile. Lead with what matters most about how to work with me.",
  },
  {
    name: "interview-me",
    description:
      "Interview me with a few guided questions and propose what my Strap is missing.",
    text: [
      "Read my Strap with read_strap. Then interview me to fill what it is missing, vague or contradictory about:",
      "",
      ...numbered(INTERVIEW_TOPICS),
      "",
      ...bulleted(INTERVIEW_RULES),
      "",
      "Then propose updates with the strap_* tools, one focused change per section, following these rules:",
      "",
      ...bulleted(WRITING_RULES),
      "- Replace or tighten existing lines instead of only adding new ones.",
    ].join("\n"),
  },
  {
    name: "tighten-my-strap",
    description:
      "Review my Strap and propose tightening or pruning where it has drifted.",
    text: `Read my Strap with read_strap, then look for anything vague, stale, duplicated, contradictory, or that only matters for one kind of task. Propose narrowly-scoped tightening or pruning with the strap_* tools, following the contract, so the profile stays under ${STRAP_WORD_BUDGET} words. If nothing durable needs changing, say so and propose nothing.`,
  },
  {
    name: "tighten-my-creed",
    description:
      "Compatibility alias for tighten-my-strap.",
    text: `Read my Strap with read_strap, then look for anything vague, stale, duplicated, contradictory, or that only matters for one kind of task. Propose narrowly-scoped tightening or pruning with the strap_* tools, following the contract, so the profile stays under ${STRAP_WORD_BUDGET} words. If nothing durable needs changing, say so and propose nothing.`,
  },
] as const;

// The onboarding "copy prompt". Built per user from their seed draft: they
// paste it into any AI, which interviews them briefly and returns a short
// Markdown Strap they paste back. No MCP, so it works with any assistant.
// The headings must match the seed (and the optional sections the compose
// route accepts), because the paste is mapped onto sections by heading.
export function buildComposePrompt(sections: StrapSection[]): string {
  const seedNames = new Set(sections.map((section) => section.name.toLowerCase()));
  const headings = [
    ...sections.map((section) => section.name),
    ...COMPOSE_OPTIONAL_SECTIONS.map((section) => section.name).filter(
      (name) => !seedNames.has(name.toLowerCase()),
    ),
  ];
  const draft = sections
    .map((section) => sectionToMarkdown(section))
    .join("\n");
  return [
    "I'm setting up Strap: a short profile that every AI agent I use reads before it answers me. Help me write it. Interview me first, using the starter draft below and what you already know about me from our conversations.",
    "",
    "How to interview me:",
    ...bulleted(INTERVIEW_RULES),
    "- Cover these topics in this order, skipping any you can already answer well:",
    ...numbered(INTERVIEW_TOPICS).map((line) => `  ${line}`),
    "",
    "How to write my Strap:",
    ...bulleted(WRITING_RULES),
    "- When the interview is done, reply with only the finished Strap as markdown inside one fenced code block, with nothing before or after it. Use exactly these headings in this order and add no others. Leave a heading empty when there is nothing durable to say:",
    "",
    ...headings.map((name) => `## ${name}`),
    "",
    "My starter draft:",
    "",
    draft,
  ].join("\n");
}

// The company onboarding "copy prompt". Same shape as buildComposePrompt but
// framed for a shared Company Strap: the file the whole team and their agents
// read before acting. The owner pastes it into any assistant, which returns a
// concise Markdown Company Strap they paste back in.
export function buildCompanyComposePrompt(
  sections: StrapSection[],
  companyName: string,
): string {
  const name = companyName.trim() || "our company";
  const headings = sections.map((section) => `## ${section.name}`).join("\n");
  const draft = sections
    .map((section) => sectionToMarkdown(section))
    .join("\n");
  return [
    `I'm setting up a shared company Strap for ${name}: one short context file our whole team and every AI agent we connect reads before it acts, so everyone stays aligned. Below is a rough starter draft built from a few onboarding questions. Using this draft plus what you know about the company, write our company Strap. Write about the company and team, not about one person.`,
    "",
    "If something important is missing or unclear, ask me first: one question per message, with two to four numbered answer options, at most five questions.",
    "",
    "Include only what changes how an AI should work for this company in most conversations and will still be true in a month. Leave out task details, project status and anything an AI can look up. Use plain, specific sentences, no filler or hashtags. Keep the whole Strap under 600 words.",
    "",
    "When you're done, reply with only the finished Strap as markdown inside one fenced code block, with nothing before or after it. Use exactly these headings, in this order, and do not add or remove sections:",
    "",
    headings,
    "",
    "Put the rewritten body under each heading. Here is the starter draft to build from:",
    "",
    draft,
  ].join("\n");
}

/** @deprecated Use STRAP_PROMPTS. */
export const CREED_PROMPTS = STRAP_PROMPTS;
export const buildStrapComposePrompt = buildComposePrompt;
export const buildCompanyStrapComposePrompt = buildCompanyComposePrompt;
