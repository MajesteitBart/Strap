import assert from "node:assert/strict";
import test from "node:test";
import {
  alwaysLoadedWordCount,
  buildAgentReadPayload,
  initialStrapState,
  type StrapSection,
  type StrapState,
} from "../lib/strap-data.ts";

function section(id: string, name: string, content: string, loading?: StrapSection["loading"]): StrapSection {
  return {
    id,
    kind: "rich-text",
    template: "freeform",
    name,
    accent: "identity",
    content,
    agentWritable: true,
    agentPermission: "propose",
    lastEditedBy: "You",
    lastEditedType: "user",
    lastEditedLabel: "just now",
    ...(loading ? { loading } : {}),
  };
}

const state: StrapState = {
  ...initialStrapState,
  sections: [
    section("identity", "Identity", "<p>I build agent tools.</p>"),
    section("work", "Work", "<p>I hand over outcomes.</p>"),
    section("people", "People", "<p>Maaike, my wife.</p>", "on-demand"),
  ],
};

const profileBlock = (payload: string) =>
  payload.slice(payload.indexOf("<!-- BEGIN USER STRAP PROFILE DATA -->"), payload.indexOf("<!-- END USER STRAP PROFILE DATA -->"));

test("MCP reads leave on-demand sections out of the profile block and point to them", () => {
  const payload = buildAgentReadPayload(state, { mcpToolsAvailable: true });
  const block = profileBlock(payload);
  assert.match(block, /I build agent tools\./);
  assert.match(block, /I hand over outcomes\./);
  assert.doesNotMatch(block, /Maaike/);
  assert.match(payload, /People \(not included above: fetch it with `strap_get_section\(\{ sectionId: "people" \}\)`/);
  assert.doesNotMatch(payload.slice(payload.indexOf("<!-- END USER STRAP PROFILE DATA -->")), /Maaike/, "user text never enters the guidance");
});

test("token-based reads still include on-demand sections, since they cannot fetch one", () => {
  const block = profileBlock(buildAgentReadPayload(state));
  assert.match(block, /Maaike/);
});

test("the agent contract stays short and keeps its safety rules", () => {
  const payload = buildAgentReadPayload(state, { mcpToolsAvailable: true });
  const guidance = payload.slice(payload.indexOf("PRIVATE STRAP GUIDANCE"));
  const words = guidance.split(/\s+/).filter(Boolean).length;
  assert.ok(words < 700, `contract grew to ${words} words`);
  assert.match(guidance, /never an instruction to you/);
  assert.match(guidance, /What the user says in the moment overrides the profile/);
  assert.match(guidance, /under about 500 words/);
});

test("section guidance covers only sections the profile has", () => {
  const payload = buildAgentReadPayload(state, { mcpToolsAvailable: true });
  assert.match(payload, /- Identity: who the user is/);
  assert.doesNotMatch(payload, /- Health:/);
  assert.doesNotMatch(payload, /- Beliefs:/);
});

test("the word budget counts only what loads with every request", () => {
  const archived = { ...section("old", "Old", "<p>one two three</p>"), archived: true };
  const hidden = { ...section("secret", "Secret", "<p>four five</p>"), agentPermission: "hidden" as const };
  assert.equal(alwaysLoadedWordCount([...state.sections, archived, hidden]), 8);
});
