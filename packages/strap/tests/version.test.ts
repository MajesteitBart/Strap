import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CLI_VERSION } from "../src/constants.js";

test("keeps the runtime version aligned with package metadata", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8")) as { version?: string };
  assert.equal(CLI_VERSION, packageJson.version);
});
