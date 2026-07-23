import assert from "node:assert/strict";
import test from "node:test";

import {
  canAdoptResolvedProfilePath,
  getProfilePathCandidates,
  hasProfilePathConflict,
  LEGACY_CREED_FILE_NAME,
  resolveProfilePath,
  STRAP_FILE_NAME,
} from "../lib/profile-file.ts";

test("new profile paths default to strap.md with a legacy read fallback", () => {
  assert.equal(resolveProfilePath(null), STRAP_FILE_NAME);
  assert.deepEqual(getProfilePathCandidates(null), [STRAP_FILE_NAME, LEGACY_CREED_FILE_NAME]);
  assert.deepEqual(getProfilePathCandidates(STRAP_FILE_NAME), [
    STRAP_FILE_NAME,
    LEGACY_CREED_FILE_NAME,
  ]);
});

test("pushes refuse to create a second canonical file beside a resolved fallback", () => {
  assert.equal(hasProfilePathConflict(STRAP_FILE_NAME, LEGACY_CREED_FILE_NAME), true);
  assert.equal(hasProfilePathConflict(STRAP_FILE_NAME, STRAP_FILE_NAME), false);
  assert.equal(hasProfilePathConflict(STRAP_FILE_NAME, undefined), false);
  assert.equal(hasProfilePathConflict(LEGACY_CREED_FILE_NAME, LEGACY_CREED_FILE_NAME), false);
});

test("stored explicit paths remain authoritative", () => {
  assert.deepEqual(getProfilePathCandidates(LEGACY_CREED_FILE_NAME), [LEGACY_CREED_FILE_NAME]);
  assert.deepEqual(getProfilePathCandidates("profiles/team.md"), ["profiles/team.md"]);
});

test("a resolved fallback path can only be adopted from the configured candidate set", () => {
  assert.equal(canAdoptResolvedProfilePath(STRAP_FILE_NAME, LEGACY_CREED_FILE_NAME), true);
  assert.equal(canAdoptResolvedProfilePath(LEGACY_CREED_FILE_NAME, STRAP_FILE_NAME), false);
  assert.equal(canAdoptResolvedProfilePath("profiles/team.md", LEGACY_CREED_FILE_NAME), false);
});
