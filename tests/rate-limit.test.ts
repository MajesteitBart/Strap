import test from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit } from "../lib/rate-limit.ts";

const take = (identifier: string, limit: number) => checkRateLimit({ scope: "test", identifier, limit, windowMs: 60_000 });

test("a constant limit allows exactly that many calls per window", () => {
  for (let index = 0; index < 3; index++) assert.equal(take("constant", 3).ok, true);
  assert.equal(take("constant", 3).ok, false);
});

test("a limit that changes mid-window keeps usage and applies the difference", () => {
  for (let index = 0; index < 200; index++) assert.equal(take("grows", 200).ok, true);
  assert.equal(take("grows", 200).ok, false);
  // Coverage grew from 100 to 150 secrets: 100 more reveals fit in this window.
  for (let index = 0; index < 100; index++) assert.equal(take("grows", 300).ok, true);
  assert.equal(take("grows", 300).ok, false);

  for (let index = 0; index < 150; index++) assert.equal(take("shrinks", 300).ok, true);
  // Shrinking below what was already used blocks the rest of the window.
  assert.equal(take("shrinks", 100).ok, false);
});
