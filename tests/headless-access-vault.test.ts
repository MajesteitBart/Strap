import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createHeadlessKey,
  digestCredential,
  isHeadlessKey,
  parseOptionalExpiry,
} from "../lib/headless-access-shared.ts";
import {
  capDeviceGrantMode,
  createDeviceUserCode,
  DEVICE_USER_CODE_ALPHABET,
  deviceGrantModesForScope,
  normalizeDeviceUserCode,
  normalizeOAuthScope,
} from "../lib/oauth-device-shared.ts";

const migration = readFileSync(
  new URL("../supabase/migrations/20260722120000_headless_access_and_secret_vault.sql", import.meta.url),
  "utf8",
);
const mcpRoute = readFileSync(new URL("../app/mcp/route.ts", import.meta.url), "utf8");
const companySections = readFileSync(
  new URL("../lib/company-sections.ts", import.meta.url),
  "utf8",
);
const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
const tokenRoute = readFileSync(new URL("../app/token/route.ts", import.meta.url), "utf8");
const oauthMetadata = readFileSync(
  new URL("../app/.well-known/oauth-authorization-server/route.ts", import.meta.url),
  "utf8",
);

test("headless keys are prefixed, high entropy, and represented by a digest", () => {
  const first = createHeadlessKey();
  const second = createHeadlessKey();
  assert.equal(isHeadlessKey(first.key), true);
  assert.notEqual(first.key, second.key);
  assert.equal(first.hash, digestCredential(first.key));
  assert.equal(first.hash.length, 64);
  assert.equal(first.prefix.includes(first.key), false);
});

test("headless expiry accepts only bounded future timestamps", () => {
  assert.equal(parseOptionalExpiry(null), null);
  assert.equal(parseOptionalExpiry(new Date(Date.now() - 1_000).toISOString()), undefined);
  assert.equal(parseOptionalExpiry(new Date(Date.now() + 367 * 86_400_000).toISOString()), undefined);
  assert.match(parseOptionalExpiry(new Date(Date.now() + 86_400_000).toISOString()) ?? "", /^\d{4}-/);
});

test("device user codes meet the entropy and normalization contract", () => {
  assert.ok(DEVICE_USER_CODE_ALPHABET.length >= 20);
  const codes = new Set(Array.from({ length: 100 }, () => createDeviceUserCode()));
  assert.equal(codes.size, 100);
  for (const code of codes) {
    assert.match(code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
    assert.equal(normalizeDeviceUserCode(code.toLowerCase()), code.replace("-", ""));
  }
  assert.equal(normalizeDeviceUserCode("IIII-OOOO"), null);
});

test("device scope keeps only supported unique values", () => {
  assert.equal(normalizeOAuthScope("read unknown propose read"), "read propose");
  assert.equal(normalizeOAuthScope(""), "read propose");
  assert.equal(normalizeOAuthScope("direct_edit"), "direct_edit");
});

test("device grants cannot exceed the client-requested OAuth scope", () => {
  assert.deepEqual(deviceGrantModesForScope("read"), ["read-only"]);
  assert.deepEqual(deviceGrantModesForScope("read propose"), ["read-only", "proposal-only"]);
  assert.deepEqual(deviceGrantModesForScope("read propose direct_edit"), [
    "read-only",
    "proposal-only",
    "direct",
  ]);
  assert.equal(capDeviceGrantMode("direct", "read"), "read-only");
  assert.equal(capDeviceGrantMode("direct", "read propose"), "proposal-only");
  assert.equal(capDeviceGrantMode("proposal-only", "read propose direct_edit"), "proposal-only");
});

test("migration keeps credentials private and Vault RPCs service-role-only", () => {
  assert.match(migration, /alter table public\.creed_headless_access_keys enable row level security/);
  assert.match(migration, /alter table public\.oauth_device_authorizations enable row level security/);
  assert.match(migration, /alter table public\.creed_vault_items enable row level security/);
  assert.match(migration, /security definer\s+set search_path = ''/gi);
  assert.match(migration, /revoke all on function public\.creed_vault_reveal_secret\(uuid\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.creed_vault_reveal_secret\(uuid\) to service_role/);
  assert.match(migration, /verification_attempts integer not null default 0 check \(verification_attempts between 0 and 10\)/);
  assert.match(migration, /v_row\.interval_seconds := least\(v_row\.interval_seconds \+ 5, 300\)/);
});

test("MCP enforcement has no explicit-grant fallback and strips mutation tokens", () => {
  assert.match(mcpRoute, /credential\.allowLegacyPersonalFallback && personal/);
  assert.match(mcpRoute, /writeToken: mode === "read-only" \? "" : state\.writeToken/);
  assert.match(mcpRoute, /directEditToken: mode === "direct" \? state\.directEditToken : ""/);
  assert.match(mcpRoute, /identifier: digestCredential\(bearer\)/);
  assert.match(
    mcpRoute,
    /if \(state\.creedId\) \{\s+await recordMcpClientUsage\(admin as never, userId, clientName, state\.creedId\);\s+\}/,
  );
});

test("credential ceilings govern advertised and executed writes", () => {
  assert.match(mcpRoute, /agentWritable: permissionToWritable\(effective\)/);
  assert.match(
    mcpRoute,
    /requireApproval: state\.settings\.requireApproval \|\| mode !== "direct"/,
  );
  assert.match(
    mcpRoute,
    /permissionCeiling: credentialModeToPermission\(credentialMode\)/,
  );
  assert.match(companySections, /permissionCeiling\?: AgentPermission/);
  assert.match(mcpRoute, /credentialMode === "read-only"/);
  assert.match(mcpRoute, /!MUTATION_TOOL_NAMES\.has\(tool\.name\)/);
  assert.match(companySections, /const createPermission = minPermission\(/);
  assert.match(
    companySections,
    /await effectivePermission\(creedId, user\.id, sectionId, role, true\),\s+permissionCeiling/,
  );
});

test("Vault and device approval pages receive private no-store caching headers", () => {
  assert.match(nextConfig, /"\/device\/:path\*"/);
  assert.match(nextConfig, /"\/vault\/:path\*"/);
});

test("OAuth discovery and token exchange advertise the RFC device grant", () => {
  assert.match(oauthMetadata, /device_authorization_endpoint: `\$\{site\}\/device\/authorize`/);
  assert.match(oauthMetadata, /urn:ietf:params:oauth:grant-type:device_code/);
  assert.match(tokenRoute, /pollDeviceAuthorization\(\{ deviceCode, clientId \}\)/);
  assert.match(tokenRoute, /creedGrants: \[\{ creedId: polled\.creedId, mode: polled\.mode \}\]/);
});
