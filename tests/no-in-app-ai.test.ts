import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url);

function sources(directory: string): string[] {
  return readdirSync(new URL(directory, root), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? sources(`${path}/`)
        : /\.(ts|tsx)$/.test(path)
          ? [path]
          : [];
    },
  );
}

test("application runtime has no LLM provider calls or retired AI requests", () => {
  for (const file of ["app/", "components/", "lib/"].flatMap(sources)) {
    const source = readFileSync(new URL(file, root), "utf8");
    assert.doesNotMatch(
      source,
      /(?:api\.)?openrouter\.ai\/(?:api|auth)|\/api\/app\/ai\/|callOpenRouter|streamOpenRouter|OPENROUTER_PLATFORM_KEY/,
      file,
    );
  }
  for (const route of [
    "agent",
    "panel",
    "tab",
    "quality",
    "settings",
    "usage",
    "openrouter-balance",
  ]) {
    assert.equal(
      existsSync(new URL(`app/api/app/ai/${route}/route.ts`, root)),
      false,
    );
  }
  assert.equal(
    existsSync(new URL("app/api/app/company/byok/route.ts", root)),
    false,
  );
});

test("external agents and user review keep their authenticated entry points", () => {
  const read = (path: string) => readFileSync(new URL(path, root), "utf8");
  assert.match(
    read("app/api/app/proposals/[id]/route.ts"),
    /requireApiAuth\(\)/,
  );
  assert.match(
    read("app/api/creed/proposals/route.ts"),
    /findUserIdByProposalToken/,
  );
  assert.match(read("app/mcp/route.ts"), /readLatestQualityReport/);
  assert.doesNotMatch(
    read("lib/quality-report.ts"),
    /fetch\(|resolveAiCredential|recordAiUsage/,
  );
  assert.match(read("components/strap/panel.tsx"), /fuzzyScore/);
  assert.doesNotMatch(
    read("components/strap/rich-text-editor.tsx"),
    /TabComplete/,
  );
  assert.doesNotMatch(
    read("lib/strap-data.ts").match(
      /GETTING_STARTED_STEPS = \[[\s\S]*?\] as const/,
    )?.[0] ?? "",
    /analysis/,
  );
});
