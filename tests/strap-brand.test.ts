import assert from "node:assert/strict";
import test from "node:test";

import {
  BRAND_CLI_COMMAND,
  BRAND_CLI_PACKAGE,
  BRAND_DESCRIPTION,
  BRAND_FILE_NAME,
  BRAND_LEGACY_FILE_NAME,
  BRAND_LEGACY_SITE_URL,
  BRAND_META_TITLE,
  BRAND_NAME,
  BRAND_SITE_URL,
  BRAND_TAGLINE,
} from "../lib/marketing/brand.ts";

test("Strap brand constants define the public contract", () => {
  assert.equal(BRAND_NAME, "Strap");
  assert.equal(BRAND_TAGLINE, "Bootstrap your agents with context, skills, and keys.");
  assert.match(BRAND_DESCRIPTION, /^Strap gives agents/);
  assert.equal(BRAND_META_TITLE, `${BRAND_NAME} - ${BRAND_TAGLINE}`);
  assert.equal(BRAND_SITE_URL, "https://strap.bvdm.ai");
  assert.equal(BRAND_LEGACY_SITE_URL, "https://creed.md");
  assert.equal(BRAND_FILE_NAME, "strap.md");
  assert.equal(BRAND_LEGACY_FILE_NAME, "creed.md");
  assert.equal(BRAND_CLI_PACKAGE, "@bvdm/strap");
  assert.equal(BRAND_CLI_COMMAND, "strap");
});
