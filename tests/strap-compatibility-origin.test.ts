import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PERMANENT_REDIRECTS, permanentRedirectFor } from "../lib/http/headers.ts";

const readme = readFileSync(
  new URL("../README.md", import.meta.url),
  "utf8",
);
const mcpRoute = readFileSync(new URL("../server/mcp/route.ts", import.meta.url), "utf8");

test("the legacy origin remains a served compatibility origin", () => {
  assert.match(
    readme,
    /https:\/\/creed\.md` remains an MCP\/OAuth compatibility origin/,
  );
  assert.match(mcpRoute, /"Access-Control-Allow-Origin": "\*"/);
  assert.match(mcpRoute, /export async function GET\(\)/);
  assert.match(mcpRoute, /export async function POST\(request: Request\)/);
  // Redirects are path-only: no origin is blanket-redirected, and the protocol
  // endpoints are always served directly.
  for (const [source] of PERMANENT_REDIRECTS) assert.ok(source.startsWith("/"), source);
  for (const path of ["/mcp", "/token", "/register", "/revoke", "/authorize", "/.well-known/oauth-authorization-server"]) {
    assert.equal(permanentRedirectFor(path), null, path);
  }
});
