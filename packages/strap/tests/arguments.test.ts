import assert from "node:assert/strict";
import test from "node:test";
import {
  parseToolArguments,
  parseToolArgumentValue,
  shellSplit,
} from "../src/commands/arguments.js";

const schema = {
  type: "object",
  properties: {
    sectionId: { type: "string" },
    limit: { type: "integer", minimum: 1, maximum: 25 },
    enabled: { type: "boolean" },
  },
  required: ["sectionId"],
};

test("converts kebab flags back to live MCP property names", async () => {
  assert.deepEqual(
    await parseToolArguments(["--section-id", "goals", "--limit", "5", "--enabled"], schema),
    { sectionId: "goals", limit: 5, enabled: true },
  );
});

test("accepts raw JSON as the universal schema fallback", async () => {
  assert.deepEqual(
    await parseToolArguments(["--args", '{"futureShape":{"value":1}}'], schema),
    { futureShape: { value: 1 } },
  );
});

test("rejects missing required arguments", async () => {
  await assert.rejects(() => parseToolArguments([], schema), /Missing required argument: sectionId/);
});

test("interactive parsing can defer required arguments to the live prompt", async () => {
  assert.deepEqual(
    await parseToolArguments([], schema, { allowMissingRequired: true }),
    {},
  );
});

test("rejects stray positional and conflicting raw arguments", async () => {
  await assert.rejects(
    () => parseToolArguments(["goals"], schema),
    /Unexpected argument: goals/,
  );
  await assert.rejects(
    () => parseToolArguments(["--args", '{"sectionId":"goals"}', "--limit", "5"], schema),
    /cannot be combined/,
  );
});

test("applies numeric limits to integer and number properties", async () => {
  await assert.rejects(
    () => parseToolArguments(["--section-id", "goals", "--limit", "26"], schema),
    /at most 25/,
  );
  await assert.rejects(
    () => parseToolArguments(["--score", "1.1"], {
      type: "object",
      properties: { score: { type: "number", maximum: 1 } },
    }),
    /at most 1/,
  );
});

test("interactive values use the same live-schema validation", () => {
  assert.equal(parseToolArgumentValue("yes", { type: "boolean" }), true);
  assert.equal(parseToolArgumentValue("0", { type: "boolean" }), false);
  assert.throws(
    () => parseToolArgumentValue("26", { type: "integer", maximum: 25 }),
    /at most 25/,
  );
});

test("splits quoted interactive commands without evaluating shell syntax", () => {
  assert.deepEqual(shellSplit('creed_search --query "pricing model"'), ["creed_search", "--query", "pricing model"]);
  assert.deepEqual(shellSplit("creed_search --query '$(whoami)'"), ["creed_search", "--query", "$(whoami)"]);
});
