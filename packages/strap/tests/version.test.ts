import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CLI_VERSION } from "../src/constants.js";

test("keeps the runtime version aligned with package metadata", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
    version?: string;
  };
  assert.equal(CLI_VERSION, packageJson.version);
});

test("publishes Strap-first package and executable metadata", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
    name?: string;
    description?: string;
    bin?: Record<string, string>;
    repository?: { directory?: string };
  };

  assert.equal(packageJson.name, "@bvdm/strap");
  assert.equal(packageJson.bin?.strap, "dist/src/bin.js");
  assert.match(packageJson.description ?? "", /context, skills, and keys/);
  assert.equal(packageJson.description?.includes("secrets"), false);
  assert.equal(packageJson.repository?.directory, "packages/strap");
});
