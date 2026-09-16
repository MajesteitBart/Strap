import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const scanner = new URL("../scripts/check-strap-rebrand.mts", import.meta.url);

test("wiki classification refresh preserves source gates and positive assertions", () => {
  const root = mkdtempSync(join(tmpdir(), "strap-wiki-brand-"));
  const allowlist = join(root, "scripts/strap-rebrand-allowlist.json");
  const run = (flag: string) => spawnSync(process.execPath, [
    "--experimental-strip-types", scanner.pathname.replace(/^\/(\w:)/, "$1"), flag,
  ], { cwd: root, encoding: "utf8" });
  try {
    execFileSync("git", ["init", "--quiet", root]);
    mkdirSync(join(root, "scripts"));
    mkdirSync(join(root, "openwiki"));
    writeFileSync(join(root, "source.ts"), 'export const legacy = "creed_key_";\n');
    writeFileSync(join(root, "README.md"), "# Strap\n");
    writeFileSync(join(root, "openwiki/old.md"), "The Creed-compatible API.\n");
    writeFileSync(allowlist, JSON.stringify({ version: 2, entries: [], assertions: [
      { file: "README.md", pattern: "^# Strap", rationale: "Keep the current product heading." },
    ] }));
    assert.equal(run("--update-allowlist").status, 0);
    const original = JSON.parse(readFileSync(allowlist, "utf8")) as { entries: { file: string }[] };
    const source = original.entries.filter((entry) => !entry.file.startsWith("openwiki/"));

    rmSync(join(root, "openwiki/old.md"));
    writeFileSync(join(root, "openwiki/new.md"), "# Current architecture\n\nUses creed_key_ for compatibility.\n");
    const updated = run("--update-generated-wiki");
    assert.equal(updated.status, 0, updated.stderr);
    const next = JSON.parse(readFileSync(allowlist, "utf8")) as { entries: { file: string }[] };
    assert.deepEqual(next.entries.filter((entry) => !entry.file.startsWith("openwiki/")), source);
    assert.ok(next.entries.some((entry) => entry.file === "openwiki/new.md"));
    assert.ok(!next.entries.some((entry) => entry.file === "openwiki/old.md"));

    writeFileSync(join(root, "source.ts"), '// shifted legacy contract\nexport const legacy = "creed_key_";\n');
    assert.equal(run("--update-generated-wiki").status, 1, "Source drift must still fail");
    writeFileSync(join(root, "source.ts"), 'export const legacy = "creed_key_";\n');
    writeFileSync(join(root, "README.md"), "# Retired product\n");
    assert.equal(run("--update-generated-wiki").status, 1, "Positive assertions must still fail");
  } finally {
    // root is the exact directory just created by mkdtempSync under the OS temp directory.
    rmSync(root, { recursive: true, force: true });
  }
});
