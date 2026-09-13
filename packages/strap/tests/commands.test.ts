import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test, { type TestContext } from "node:test";

const execFileAsync = promisify(execFile);
const binPath = fileURLToPath(new URL("../src/bin.js", import.meta.url));

async function createCliServer(
  options: { httpFailure?: boolean; toolError?: boolean } = {},
): Promise<{ serverUrl: string; close(): Promise<void> }> {
  const server = createServer(async (request, response) => {
    if (options.httpFailure) {
      response.setHeader("Content-Type", "application/json");
      response.end("{");
      return;
    }
    if (request.method === "GET") {
      response.writeHead(405).end();
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const message = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
      id?: string | number;
      method: string;
    };
    if (message.method.startsWith("notifications/")) {
      response.writeHead(202).end();
      return;
    }
    const results: Record<string, unknown> = {
      initialize: {
        protocolVersion: "2025-06-18",
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: { name: "Test Strap", version: "1" },
      },
      "tools/list": {
        tools: [{
          name: "failing_tool",
          description: "Returns a deterministic MCP error.",
          inputSchema: { type: "object" },
        }],
      },
      "resources/list": { resources: [] },
      "prompts/list": { prompts: [] },
      "tools/call": options.toolError
        ? {
            content: [{
              type: "text",
              text: JSON.stringify({ message: "fixture tool failure" }),
            }],
            isError: true,
          }
        : {
            content: [{
              type: "text",
              text: JSON.stringify({ ok: true }),
            }],
          },
    };
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({
      jsonrpc: "2.0",
      id: message.id,
      result: results[message.method],
    }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  return {
    serverUrl: `http://127.0.0.1:${address.port}/mcp`,
    close: () => new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections();
    }),
  };
}

async function commandEnvironment(
  context: TestContext,
  serverUrl: string,
): Promise<NodeJS.ProcessEnv> {
  const directory = await mkdtemp(join(tmpdir(), "strap-command-test-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const environment = { ...process.env };
  delete environment.FORCE_COLOR;
  return {
    ...environment,
    STRAP_CONFIG_DIR: directory,
    STRAP_MCP_URL: serverUrl,
    NO_COLOR: "1",
    TERM: "dumb",
  };
}

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

test("writes successful JSON to stdout with exit code 0 and no ANSI", async (context) => {
  const fixture = await createCliServer();
  context.after(() => fixture.close());
  const env = await commandEnvironment(context, fixture.serverUrl);
  const result = await execFileAsync(
    process.execPath,
    [binPath, "tools", "--json"],
    { env },
  );

  const tools = JSON.parse(result.stdout) as Array<{ name?: string }>;
  assert.equal(tools[0]?.name, "failing_tool");
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.includes("\u001b["), false);
});

test("returns exit code 1 for a runtime transport failure", async (context) => {
  const fixture = await createCliServer({ httpFailure: true });
  context.after(() => fixture.close());
  const env = await commandEnvironment(context, fixture.serverUrl);

  await assert.rejects(
    () => execFileAsync(process.execPath, [binPath, "tools", "--json"], { env }),
    (error: unknown) => {
      const failure = error as {
        code?: number;
        stdout?: string;
        stderr?: string;
      };
      assert.equal(failure.code, 1);
      assert.equal(failure.stdout, "");
      assert.notEqual(failure.stderr, "");
      assert.equal((failure.stderr ?? "").includes("\u001b["), false);
      return true;
    },
  );
});

test("preserves tool error JSON on stdout and exits with code 3", async (context) => {
  const fixture = await createCliServer({ toolError: true });
  context.after(() => fixture.close());
  const env = await commandEnvironment(context, fixture.serverUrl);

  await assert.rejects(
    () => execFileAsync(
      process.execPath,
      [binPath, "call", "failing_tool", "--args", "{}", "--json"],
      { env },
    ),
    (error: unknown) => {
      const failure = error as {
        code?: number;
        stdout?: string;
        stderr?: string;
      };
      assert.equal(failure.code, 3);
      assert.deepEqual(JSON.parse(failure.stdout ?? ""), {
        message: "fixture tool failure",
      });
      assert.match(
        failure.stderr ?? "",
        /^The Strap tool returned an error\.\r?\n$/,
      );
      assert.equal((failure.stdout ?? "").includes("\u001b["), false);
      assert.equal((failure.stderr ?? "").includes("\u001b["), false);
      return true;
    },
  );
});
