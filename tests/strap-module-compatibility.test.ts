import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as strapAttribution from "../lib/strap-attribution.ts";
import * as legacyAttribution from "../lib/creed-attribution.ts";
import * as strapData from "../lib/strap-data.ts";
import * as legacyData from "../lib/creed-data.ts";
import * as strapMarkdown from "../lib/strap-markdown.ts";
import * as legacyMarkdown from "../lib/creed-markdown.ts";
import * as strapPermissions from "../lib/strap-permissions.ts";
import * as legacyPermissions from "../lib/creed-permissions.ts";

const SHIMS = [
  ["creed-attribution.ts", "strap-attribution.ts"],
  ["creed-backend.ts", "strap-backend.ts"],
  ["creed-backend-errors.ts", "strap-backend-errors.ts"],
  ["creed-context.ts", "strap-context.ts"],
  ["creed-data.ts", "strap-data.ts"],
  ["creed-markdown.ts", "strap-markdown.ts"],
  ["creed-membership.ts", "strap-membership.ts"],
  ["creed-permissions.ts", "strap-permissions.ts"],
  ["creed-prompts.ts", "strap-prompts.ts"],
  ["validation/creed-state.ts", "strap-state.ts"],
] as const;

test("every Creed module path remains a deprecated re-export shim", () => {
  for (const [legacyPath, canonicalFile] of SHIMS) {
    const source = readFileSync(new URL(`../lib/${legacyPath}`, import.meta.url), "utf8");
    assert.match(source, /@deprecated/, legacyPath);
    assert.match(source, new RegExp(`export \\* from "\\./${canonicalFile.replace(".", "\\.")}"`), legacyPath);
  }
});

test("pure compatibility modules preserve canonical runtime identities", () => {
  assert.equal(legacyAttribution.actorLabel, strapAttribution.actorLabel);
  assert.equal(legacyData.initialCreedState, strapData.initialStrapState);
  assert.equal(legacyData.buildVisibleCreedMarkdown, strapData.buildVisibleStrapMarkdown);
  assert.equal(legacyMarkdown.parseCreedMarkdown, strapMarkdown.parseStrapMarkdown);
  assert.equal(
    legacyPermissions.resolveSectionPermission,
    strapPermissions.resolveSectionPermission,
  );
});
