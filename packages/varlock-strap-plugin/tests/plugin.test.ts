import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, mkdir, writeFile, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const cli = fileURLToPath(new URL("../../node_modules/varlock/bin/cli.js", import.meta.url));
const builtPlugin = fileURLToPath(new URL("../plugin.cjs", import.meta.url));
const packageManifest = fileURLToPath(new URL("../../package.json", import.meta.url));
const itemId = "11111111-1111-4111-8111-111111111111";
const token = `strap_key_${"x".repeat(43)}`;

for (const installation of ["bundle", "package"] as const) {
  test(`real Varlock loads a relocated ${installation}, resolves two instances and masks secrets`, async () => {
    const folder = await mkdtemp(join(tmpdir(), "strap-varlock-"));
    const secret = "fixture-only-resolved-value";
    const requests: string[] = [];
    const server = createServer(async (request, response) => {
      requests.push(request.headers.authorization ?? "");
      assert.equal(request.method, "POST");
      assert.equal(request.url, "/api/strap/vault/reveal");
      const chunks = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString()), { reference: `secret://${itemId}` });
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ secret }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    try {
      if (installation === "package") {
        const packageFolder = join(folder, "node_modules", "@bvdm", "varlock-strap-plugin");
        await mkdir(join(packageFolder, "dist"), { recursive: true });
        await copyFile(packageManifest, join(packageFolder, "package.json"));
        await copyFile(builtPlugin, join(packageFolder, "dist", "plugin.cjs"));
        await writeFile(join(folder, "package.json"), JSON.stringify({ private: true }));
      } else {
        await copyFile(builtPlugin, join(folder, "plugin.cjs"));
      }
      await writeFile(join(folder, ".env.schema"), [
        `# @plugin(${installation === "package" ? "@bvdm/varlock-strap-plugin" : "./plugin.cjs"})`,
        `# @initStrap(token=$STRAP_API_KEY, server=http://127.0.0.1:${address.port})`,
        `# @initStrap(id=company, token=$STRAP_API_KEY, server=http://127.0.0.1:${address.port})`,
        "# @defaultSensitive=false",
        "# ---",
        "# @type=strapAccessKey @required",
        "STRAP_API_KEY=",
        `FIRST=strap(secret://${itemId})`,
        `SECOND=strap(company, ${itemId})`,
      ].join("\n"));
      const env = { ...process.env, STRAP_API_KEY: token, VARLOCK_TELEMETRY_DISABLED: "1", NO_COLOR: "1" };
      const loaded = await run(process.execPath, [cli, "load"], { cwd: folder, env });
      assert.equal(loaded.stdout.includes(secret), false);
      assert.equal(loaded.stderr.includes(secret), false);
      assert.equal(loaded.stdout.includes(token), false);
      assert.equal(loaded.stderr.includes(token), false);
      assert.equal(requests.length, 2);
      const childScript = "if (process.env.FIRST !== process.env.SECOND || process.env.FIRST !== 'fixture-only-resolved-value' || process.env.STRAP_API_KEY) process.exit(9); process.stdout.write('resolved');";
      const injected = await run(process.execPath, [cli, "run", "--", process.execPath, "-e", childScript], { cwd: folder, env });
      assert.match(injected.stdout, /resolved/);
      assert.equal(requests.length, 4);
      assert.ok(requests.every((value) => value === `Bearer ${token}`));
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      await rm(folder, { recursive: true, force: true });
    }
  });
}
