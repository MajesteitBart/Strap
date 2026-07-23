import assert from "node:assert/strict";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { credentialsPath } from "../src/config/paths.js";
import { loadCredential, removeCredential, saveCredential } from "../src/config/store.js";

test("stores credentials per normalized MCP server with restrictive permissions", async () => {
  const directory = await mkdtemp(join(tmpdir(), "strap-cli-test-"));
  process.env.STRAP_CONFIG_DIR = directory;
  await saveCredential("https://strap.bvdm.ai/mcp/", { tokens: { access_token: "secret" } });
  assert.deepEqual(await loadCredential("https://strap.bvdm.ai/mcp"), { tokens: { access_token: "secret" } });
  if (process.platform !== "win32") assert.equal((await stat(credentialsPath())).mode & 0o777, 0o600);
  await removeCredential("https://strap.bvdm.ai/mcp");
  delete process.env.STRAP_CONFIG_DIR;
});
