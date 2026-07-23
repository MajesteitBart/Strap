import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const binPath = fileURLToPath(new URL("../src/bin.js", import.meta.url));

test("help and version do not depend on server configuration", async () => {
  const env = { ...process.env, STRAP_MCP_URL: "not a URL" };
  const help = await execFileAsync(process.execPath, [binPath, "--help"], { env });
  const version = await execFileAsync(process.execPath, [binPath, "--version"], { env });

  assert.match(help.stdout, /^Usage: strap/);
  assert.match(version.stdout, /^\d+\.\d+\.\d+\n$/);
});

test("invalid command shapes fail before attempting OAuth", async () => {
  await assert.rejects(
    () => execFileAsync(process.execPath, [binPath, "call"], {
      env: { ...process.env, STRAP_MCP_URL: "not a URL" },
    }),
    (error: unknown) => {
      const failure = error as { code?: number; stderr?: string };
      assert.equal(failure.code, 2);
      assert.match(failure.stderr ?? "", /Usage: strap call <tool>/);
      return true;
    },
  );
});
