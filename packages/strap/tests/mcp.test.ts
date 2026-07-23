import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { connectStrap, listAllPrompts, listAllResources, listAllTools } from "../src/mcp/client.js";

test("walks every advertised MCP capability page", async () => {
  const client = {
    listTools: async (params?: { cursor?: string }) =>
      params?.cursor
        ? { tools: [{ name: "tool-two", inputSchema: { type: "object" } }] }
        : { tools: [{ name: "tool-one", inputSchema: { type: "object" } }], nextCursor: "tools-2" },
    listResources: async (params?: { cursor?: string }) =>
      params?.cursor
        ? { resources: [{ uri: "creed://two", name: "Two" }] }
        : { resources: [{ uri: "creed://one", name: "One" }], nextCursor: "resources-2" },
    listPrompts: async (params?: { cursor?: string }) =>
      params?.cursor
        ? { prompts: [{ name: "prompt-two" }] }
        : { prompts: [{ name: "prompt-one" }], nextCursor: "prompts-2" },
  } as unknown as Client;

  assert.deepEqual(
    (await listAllTools(client)).map((tool) => tool.name),
    ["tool-one", "tool-two"],
  );
  assert.deepEqual(
    (await listAllResources(client)).map((resource) => resource.uri),
    ["creed://one", "creed://two"],
  );
  assert.deepEqual(
    (await listAllPrompts(client)).map((prompt) => prompt.name),
    ["prompt-one", "prompt-two"],
  );
});

test("stops when an MCP server repeats a pagination cursor", async () => {
  const client = {
    listTools: async () => ({
      tools: [],
      nextCursor: "same-cursor",
    }),
  } as unknown as Client;

  await assert.rejects(
    () => listAllTools(client),
    /repeated a tools cursor/,
  );
});

test("discovers and invokes an MCP tool that the CLI has never defined", async (context) => {
  let sawAgentAttribution = false;
  const server = createServer(async (request, response) => {
    if (request.headers["x-strap-cli-agent"] === "codex") {
      sawAgentAttribution = true;
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
      params?: { name?: string; arguments?: Record<string, unknown> };
    };
    if (message.method.startsWith("notifications/")) {
      response.writeHead(202).end();
      return;
    }
    const results: Record<string, unknown> = {
      initialize: { protocolVersion: "2025-06-18", capabilities: { tools: {}, resources: {}, prompts: {} }, serverInfo: { name: "Test Strap", version: "1" } },
      "tools/list": { tools: [{ name: "future_creed_tool", description: "Added after the CLI shipped.", inputSchema: { type: "object", properties: { value: { type: "string" } }, required: ["value"] } }] },
      "resources/list": { resources: [{ uri: "creed://profile", name: "Strap" }] },
      "prompts/list": { prompts: [{ name: "future-prompt", description: "A future prompt." }] },
      "tools/call": { content: [{ type: "text", text: JSON.stringify({ echoed: message.params?.arguments?.value }) }] },
    };
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: results[message.method] }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => server.close());
  const address = server.address();
  assert(address && typeof address !== "string");
  process.env.STRAP_CONFIG_DIR = `/tmp/strap-cli-mcp-test-${process.pid}`;

  const connection = await connectStrap(
    `http://127.0.0.1:${address.port}/mcp`,
    true,
    "codex",
  );
  context.after(() => connection.close());
  const [tools, resources, prompts] = await Promise.all([
    listAllTools(connection.client),
    listAllResources(connection.client),
    listAllPrompts(connection.client),
  ]);
  assert.equal(tools[0]?.name, "future_creed_tool");
  assert.equal(resources[0]?.uri, "creed://profile");
  assert.equal(prompts[0]?.name, "future-prompt");
  const result = await connection.client.callTool({ name: "future_creed_tool", arguments: { value: "live" } });
  assert.deepEqual(result.content, [{ type: "text", text: '{"echoed":"live"}' }]);
  assert.equal(sawAgentAttribution, true);
  delete process.env.STRAP_CONFIG_DIR;
});
