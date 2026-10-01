import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeNextPath } from "../lib/safe-next.ts";

test("same-origin paths survive unchanged", () => {
  assert.equal(sanitizeNextPath("/settings"), "/settings");
  assert.equal(sanitizeNextPath("/authorize?client_id=x&redirect_uri=https%3A%2F%2Fclient.example"), "/authorize?client_id=x&redirect_uri=https%3A%2F%2Fclient.example");
  assert.equal(sanitizeNextPath(["/file", "/other"]), "/file");
});

test("off-site and malformed targets fall back to the root", () => {
  for (const target of [
    undefined,
    null,
    "",
    "settings",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "/\r/evil.example",
    "/\u0000/evil.example",
    "/\t\\evil.example",
  ]) {
    assert.equal(sanitizeNextPath(target), "/", JSON.stringify(target));
  }
});
