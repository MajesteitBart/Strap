import assert from "node:assert/strict";
import test from "node:test";
import {
  CLI_ATTRIBUTABLE_AGENT_IDS,
  getAgentIconKind,
} from "../lib/agent-icon.ts";
import { ATTRIBUTABLE_AGENT_IDS as STRAP_ATTRIBUTABLE_AGENT_IDS } from "../packages/strap/src/agent-ids.ts";
import { ATTRIBUTABLE_AGENT_IDS as LEGACY_ATTRIBUTABLE_AGENT_IDS } from "../packages/creed-cli/src/agent-ids.ts";

test("agent icon inference keeps specific clients ahead of broad brands", () => {
  assert.equal(getAgentIconKind("Claude Code"), "claudecode");
  assert.equal(getAgentIconKind("claude-code"), "claudecode");
  assert.equal(getAgentIconKind("Anthropic Claude Code MCP"), "claudecode");
  assert.equal(getAgentIconKind("Claude"), "claude");
});

test("agent icon inference keeps OpenAI surfaces distinct", () => {
  assert.equal(getAgentIconKind("Codex"), "codex");
  assert.equal(getAgentIconKind("OpenAI Codex CLI"), "codex");
  assert.equal(getAgentIconKind("ChatGPT"), "chatgpt");
  assert.equal(getAgentIconKind("ChatGPT connector"), "chatgpt");
});

test("agent icon inference gives Strap its first-party CLI identity", () => {
  assert.equal(getAgentIconKind("Strap"), "cli");
  assert.equal(getAgentIconKind("Strap CLI"), "cli");
  assert.equal(getAgentIconKind("strap-cli"), "cli");
  assert.equal(getAgentIconKind("Bart's Strap CLI"), "cli");
});

test("agent icon inference preserves the legacy Creed CLI identity", () => {
  assert.equal(getAgentIconKind("Creed CLI"), "cli");
  assert.equal(getAgentIconKind("creed-cli"), "cli");
});

test("the Strap package and server accept the same CLI attribution IDs", () => {
  assert.deepEqual(STRAP_ATTRIBUTABLE_AGENT_IDS, CLI_ATTRIBUTABLE_AGENT_IDS);
});

test("the legacy package retains compatible CLI attribution IDs", () => {
  assert.deepEqual(LEGACY_ATTRIBUTABLE_AGENT_IDS, CLI_ATTRIBUTABLE_AGENT_IDS);
});
