import assert from "node:assert/strict";
import test from "node:test";
import { buildHiddenAgentGuidanceMarkdown, initialCreedState } from "../lib/creed-data.ts";

test("agent guidance uses the Strap production origin by default", () => {
  const guidance = buildHiddenAgentGuidanceMarkdown();

  assert.match(guidance, /### What Strap is/);
  assert.match(guidance, /Docs URL: https:\/\/strap\.bvdm\.ai\/docs/);
  assert.doesNotMatch(guidance, /Docs URL: https:\/\/creed\.md\/docs/);
});

test("fallback connection state points new sessions at Strap", () => {
  assert.match(initialCreedState.readUrl, /^https:\/\/strap\.bvdm\.ai\//);
  assert.equal(initialCreedState.mcpUrl, "https://strap.bvdm.ai/mcp");
});
