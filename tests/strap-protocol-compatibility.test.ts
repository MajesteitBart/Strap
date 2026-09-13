import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createHeadlessKey,
  isHeadlessKey,
} from "../lib/headless-access-shared.ts";
import { readStrapId } from "../lib/strap-api.ts";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const mcpRoute = source("app/mcp/route.ts");
const creedReadRoute = source("app/api/creed/route.ts");
const creedProposalRoute = source("app/api/creed/proposals/route.ts");
const creedWriteRoute = source("app/api/creed/write/route.ts");
const oauth = source("lib/oauth.ts");
const oauthDevice = source("lib/oauth-device.ts");
const prompts = source("lib/strap-prompts.ts");
const agentContract = source("lib/strap-data.ts");
const backend = source("lib/strap-backend.ts");
const secretCrypto = source("lib/secret-crypto.ts");
const modelCatalog = source("lib/ai/model-catalog.ts");

test("new headless keys are Strap-prefixed while legacy keys remain recognized", () => {
  const created = createHeadlessKey();
  assert.match(created.key, /^strap_key_/);
  assert.equal(isHeadlessKey(created.key), true);
  assert.equal(isHeadlessKey(`creed_key_${"a".repeat(43)}`), true);
});

test("Strap HTTP routes share Creed handler and rate-limit implementations", () => {
  assert.match(source("app/api/strap/route.ts"), /app\/api\/creed\/route/);
  assert.match(
    source("app/api/strap/proposals/route.ts"),
    /app\/api\/creed\/proposals\/route/,
  );
  assert.match(
    source("app/api/strap/write/route.ts"),
    /app\/api\/creed\/write\/route/,
  );
  assert.match(creedReadRoute, /scope: "creed-read"/);
  assert.match(creedProposalRoute, /scope: "creed-proposals"/);
  assert.match(creedWriteRoute, /scope: "creed-write"/);
});

test("MCP discovery is Strap-first and legacy calls use the same dispatcher", () => {
  assert.match(mcpRoute, /\["list_creeds", "list_straps"\]/);
  assert.match(mcpRoute, /\["read_creed", "read_strap"\]/);
  assert.match(mcpRoute, /LEGACY_TOOL_NAMES\.get\(requestedName\)/);
  assert.match(mcpRoute, /const STRAP_RESOURCE_URI = "strap:\/\/profile"/);
  assert.match(
    mcpRoute,
    /uri !== STRAP_RESOURCE_URI && uri !== LEGACY_CREED_RESOURCE_URI/,
  );
  assert.match(mcpRoute, /mcpToolsAvailable: true/);
  assert.match(mcpRoute, /access: credentialMode/);
  assert.match(mcpRoute, /"strap_append_to_section"/);
  assert.doesNotMatch(
    mcpRoute.match(/recommendedTools: \[[\s\S]*?\],/)?.[0] ?? "",
    /"creed_/,
  );
  assert.match(prompts, /name: "tighten-my-strap"/);
  assert.match(prompts, /name: "tighten-my-creed"/);
});

test("new OAuth values use Strap prefixes without prefix-gating hashed lookup", () => {
  assert.match(oauth, /generateOpaqueToken\("strap_client"\)/);
  assert.match(oauth, /generateOpaqueToken\("strap_ac"\)/);
  assert.match(oauth, /generateOpaqueToken\("strap_at"\)/);
  assert.match(oauth, /generateOpaqueToken\("strap_rt"\)/);
  assert.match(oauthDevice, /`strap_dc_/);
  assert.doesNotMatch(oauth, /startsWith\("strap_/);
});

test("canonical configuration aliases precede legacy fallbacks", () => {
  assert.match(
    secretCrypto,
    /process\.env\.STRAP_ENCRYPTION_SECRET \|\|\s+process\.env\.CREED_ENCRYPTION_SECRET/,
  );
  assert.match(
    modelCatalog,
    /process\.env\.STRAP_AGENT_MODEL\?\.trim\(\) \|\|\s+process\.env\.CREED_AGENT_MODEL\?\.trim\(\)/,
  );
});

test("agent guidance has no secret-bearing read URL and advertises Strap tools", () => {
  assert.doesNotMatch(backend, /api\/creed\?token=/);
  assert.doesNotMatch(agentContract, /readUrl: .*token=/);
  assert.match(backend, /return `\$\{getSiteUrl\(\)\}\/api\/strap`/);
  assert.match(agentContract, /strap_update_section/);
  assert.match(agentContract, /propose_strap_update/);
});

test("browser API ids read both field names and write Strap fields additively", () => {
  assert.equal(readStrapId({ strapId: "new", creedId: "old" }), "new");
  assert.equal(readStrapId({ creedId: "old" }), "old");
  assert.match(source("app/api/app/straps/route.ts"), /strapId: creed\.id/);
  assert.match(source("app/api/app/straps/route.ts"), /\{ straps, creeds: straps \}/);
  assert.match(source("app/api/app/straps/route.ts"), /requireApiAuth\(\)/);
  assert.match(
    source("app/api/app/creeds/route.ts"),
    /app\/api\/app\/straps\/route/,
  );
  assert.match(
    source("app/api/app/straps/activate/route.ts"),
    /\{ ok: true, strapId: creedId, creedId, role \}/,
  );
  assert.match(
    source("app/api/app/straps/activate/route.ts"),
    /requireApiAuth\(\)/,
  );
  assert.match(
    source("app/api/app/creeds/activate/route.ts"),
    /app\/api\/app\/straps\/activate\/route/,
  );
  assert.match(
    source("app/authorize/decision/route.ts"),
    /form\.get\("strap_grant"\) \?\? form\.get\("creed_grant"\)/,
  );
  assert.match(
    source("app/device/decision/route.ts"),
    /form\.get\("strap_id"\) \?\? form\.get\("creed_id"\)/,
  );

  const activeBrowserCallers = [
    source("components/strap/company-onboarding-screen.tsx"),
    source("components/strap/strap-switcher.tsx"),
    source("components/strap/strap-provider.tsx"),
  ].join("\n");
  assert.match(activeBrowserCallers, /\/api\/app\/straps/);
  assert.doesNotMatch(activeBrowserCallers, /\/api\/app\/creeds/);
});
