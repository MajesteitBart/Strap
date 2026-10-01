import assert from "node:assert/strict";
import test from "node:test";
import { fuzzyScore } from "../lib/panel/fuzzy.ts";
import {
  ACCOUNT_SEARCH_COMMANDS,
  SETTINGS_SEARCH_COMMANDS,
} from "../lib/panel/settings-search.ts";

const COMMANDS = [
  ...ACCOUNT_SEARCH_COMMANDS.map((command) => ({ ...command, key: `account:${command.key}` })),
  ...SETTINGS_SEARCH_COMMANDS.map((command) => ({ ...command, key: `settings:${command.key}` })),
];

test("local search finds account and settings destinations through familiar aliases", () => {
  for (const [query, expected] of [
    ["permissions", "settings:agent-edits"],
    ["repo", "settings:version-control"],
    ["backup", "settings:data"],
    ["remove account", "account:danger"],
    ["email", "account:profile"],
    ["2fa", "account:security"],
    ["connect account", "settings:integrations"],
    ["restore", "settings:archived"],
  ]) {
    const matches = COMMANDS
      .map((command) => ({
        key: command.key,
        score: fuzzyScore(query, command.label, command.keywords),
      }))
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score);
    assert.equal(matches[0]?.key, expected, query);
  }
});
