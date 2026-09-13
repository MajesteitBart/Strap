import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const reader = fileURLToPath(new URL("../.agents/scripts/read-local-sync-map.mjs", import.meta.url));

test("local sync validation runs from paths with spaces and URL characters", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "strap sync #"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const scripts = path.join(root, ".agents", "scripts");
  const tasks = path.join(root, ".project", "projects", "example", "tasks");
  mkdirSync(scripts, { recursive: true });
  mkdirSync(tasks, { recursive: true });
  const executable = path.join(scripts, "read-local-sync-map.mjs");
  copyFileSync(reader, executable);
  writeFileSync(path.join(tasks, "T-001.md"), "---\nid: T-001\ndepends_on: []\n---\n");
  const dependent = path.join(tasks, "T-002.md");
  writeFileSync(dependent, "---\nid: T-002\ndepends_on: [T-001]\n---\n");

  const valid = spawnSync(process.execPath, [executable, "--json"], { cwd: root, encoding: "utf8" });
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(JSON.parse(valid.stdout).projects[0].tasks.length, 2);

  writeFileSync(dependent, "---\nid: T-002\ndepends_on: [T-999]\n---\n");
  const invalid = spawnSync(process.execPath, [executable], { cwd: root, encoding: "utf8" });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /example\/T-002 depends on missing local task T-999/);
});

test("repository task dependencies resolve through the executable validator", () => {
  const result = spawnSync(process.execPath, [reader, "--json"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(JSON.parse(result.stdout).projects.length > 0);
});
