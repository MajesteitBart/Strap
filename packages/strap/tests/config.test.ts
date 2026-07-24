import assert from "node:assert/strict";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  configDirectory,
  credentialsPath,
  settingsPath,
} from "../src/config/paths.js";
import { loadCredential, removeCredential, saveCredential } from "../src/config/store.js";

test("uses Strap-only configuration names and paths", () => {
  const strapDirectory = join(tmpdir(), "strap-config");
  assert.equal(
    configDirectory({
      STRAP_CONFIG_DIR: strapDirectory,
      CREED_CONFIG_DIR: join(tmpdir(), "legacy-creed-config"),
    }),
    strapDirectory,
  );
  assert.equal(credentialsPath({ STRAP_CONFIG_DIR: strapDirectory }), join(strapDirectory, "credentials.json"));
  assert.equal(settingsPath({ STRAP_CONFIG_DIR: strapDirectory }), join(strapDirectory, "config.json"));
});

test("stores credentials per normalized MCP server with restrictive permissions", async () => {
  const directory = await mkdtemp(join(tmpdir(), "strap-cli-test-"));
  process.env.STRAP_CONFIG_DIR = directory;
  await saveCredential("https://strap.bvdm.ai/mcp/", { tokens: { access_token: "secret" } });
  assert.deepEqual(await loadCredential("https://strap.bvdm.ai/mcp"), { tokens: { access_token: "secret" } });
  if (process.platform !== "win32") assert.equal((await stat(credentialsPath())).mode & 0o777, 0o600);
  await removeCredential("https://strap.bvdm.ai/mcp");
  delete process.env.STRAP_CONFIG_DIR;
});
