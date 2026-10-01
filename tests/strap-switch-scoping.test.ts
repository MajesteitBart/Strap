import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

// The sidebar switcher can change the active Strap while any app page is open.
// Screens that seed local state from the active Strap must remount per Strap, or
// a draft or item list from one Strap can be saved to, or acted on in, another.
test("Strap-scoped screens remount when the active Strap changes", () => {
  const settings = read("components/strap/settings-screen.tsx");
  assert.match(settings, /<CompanySettings key=\{state\.creedId\} \/>/);
  assert.match(settings, /<PersonalSettingsScreen key=\{state\.creedId\} \/>/);

  const vault = read("components/strap/api-key-vault-screen.tsx");
  assert.match(vault, /<StrapVault key=\{state\.creedId \?\? "none"\} \/>/);

  const skills = read("components/strap/skills-screen.tsx");
  assert.match(skills, /key=\{state\.creedId\}/);
});

test("the shell owns the only Strap switcher", () => {
  assert.match(read("components/strap/shell.tsx"), /<StrapSwitcher collapsed=\{collapsed\} \/>/);
  for (const page of ["components/strap/file-screen.tsx", "components/strap/skills-screen.tsx"]) {
    assert.doesNotMatch(read(page), /<StrapSwitcher\b/, page);
  }
});
