import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAgentReadPayload,
  buildHiddenAgentGuidanceMarkdown,
  initialStrapState,
} from "../lib/strap-data.ts";

test("agent guidance uses the Strap production origin by default", () => {
  const guidance = buildHiddenAgentGuidanceMarkdown();

  assert.match(guidance, /### What Strap is/);
  assert.match(guidance, /Docs URL: https:\/\/strap\.bvdm\.ai\/docs/);
  assert.doesNotMatch(guidance, /Docs URL: https:\/\/creed\.md\/docs/);
});

test("fallback connection state points new sessions at Strap", () => {
  assert.match(initialStrapState.readUrl, /^https:\/\/strap\.bvdm\.ai\//);
  assert.equal(initialStrapState.mcpUrl, "https://strap.bvdm.ai/mcp");
});

test("agent read payload uses Strap-only guidance and data markers", () => {
  const payload = buildAgentReadPayload(initialStrapState);

  assert.match(payload, /PRIVATE STRAP GUIDANCE/);
  assert.match(payload, /BEGIN USER STRAP PROFILE DATA/);
  assert.match(payload, /END USER STRAP PROFILE DATA/);
  assert.doesNotMatch(payload, /PRIVATE CREED GUIDANCE/);
  assert.doesNotMatch(payload, /USER CREED DATA/);
});

test("MCP agent reads receive the live Strap tool policy without bearer secrets", () => {
  const payload = buildAgentReadPayload(initialStrapState, {
    mcpToolsAvailable: true,
  });

  assert.match(payload, /Use the canonical Strap MCP tools/);
  assert.match(payload, /strap_append_to_section/);
  assert.match(payload, /get_write_policy/);
  assert.doesNotMatch(payload, /This payload is currently read-only/);
  assert.doesNotMatch(payload, /Authorization: Bearer/);
  assert.doesNotMatch(payload, /proposal_token/);
  assert.doesNotMatch(payload, /direct_edit_token/);
});
