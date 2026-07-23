import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const decisions = readFileSync(
  new URL("../.project/projects/strap-rebrand/decisions.md", import.meta.url),
  "utf8",
);
const mcpRoute = readFileSync(new URL("../app/mcp/route.ts", import.meta.url), "utf8");
const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");

test("the legacy origin remains a served compatibility origin", () => {
  assert.match(
    decisions,
    /https:\/\/creed\.md` remains a functioning MCP\/OAuth compatibility origin/,
  );
  assert.match(mcpRoute, /"Access-Control-Allow-Origin": "\*"/);
  assert.match(mcpRoute, /export async function GET\(\)/);
  assert.match(mcpRoute, /export async function POST\(request: Request\)/);
  assert.doesNotMatch(nextConfig, /source:\s*"https:\/\/creed\.md/);
});
