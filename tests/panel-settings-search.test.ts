import assert from "node:assert/strict";
import test from "node:test";
import { fuzzyScore } from "../lib/panel/fuzzy.ts";
import { SETTINGS_SEARCH_COMMANDS } from "../lib/panel/settings-search.ts";

test("local search finds retained settings through familiar aliases", () => {
  for (const [query, expected] of [
    ["permissions", "agent-edits"],
    ["repo", "version-control"],
    ["backup", "data"],
    ["remove account", "danger"],
    ["email", "profile"],
    ["connect account", "integrations"],
    ["restore", "archived"],
  ]) {
    const matches = SETTINGS_SEARCH_COMMANDS
      .map((command) => ({
        key: command.key,
        score: fuzzyScore(query, command.label, command.keywords),
      }))
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score);
    assert.equal(matches[0]?.key, expected, query);
  }
});
