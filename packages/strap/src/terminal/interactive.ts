import { createInterface } from "node:readline/promises";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  parseToolArguments,
  parseToolArgumentValue,
  shellSplit,
  type JsonSchema,
} from "../commands/arguments.js";
import { errorMessage } from "../errors.js";
import { listAllTools } from "../mcp/client.js";
import { renderBrand } from "./brand.js";
import { printToolResult } from "./output.js";

type ObjectSchema = {
  properties?: Record<string, JsonSchema & { description?: string }>;
  required?: string[];
};

async function fillMissingArguments(
  rl: ReturnType<typeof createInterface>,
  tool: Tool,
  initial: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const schema = tool.inputSchema as ObjectSchema;
  const result = { ...initial };
  for (const name of schema.required ?? []) {
    if (result[name] !== undefined) continue;
    const property = schema.properties?.[name];
    const detail = property?.description ? `\n  ${property.description}` : "";
    const options = property?.enum ? ` [${property.enum.join(" | ")}]` : "";
    const value = await rl.question(`${detail}\n${name}${options}: `);
    if (!value.trim()) throw new Error(`${name} is required.`);
    result[name] = parseToolArgumentValue(value, property);
  }
  return result;
}

export async function runInteractive(client: Client, tools: Tool[]): Promise<void> {
  let liveTools = tools;
  const builtIns = ["help", "tools", "refresh", "exit", "quit"];
  const completer = (line: string): [string[], string] => {
    const fragment = line.trimStart();
    const names = liveTools.map((tool) => tool.name).sort();
    const options = [...builtIns, ...names].filter((name) => name.startsWith(fragment));
    return [options.length > 0 ? options : [...builtIns, ...names], fragment];
  };
  const rl = createInterface({ input: process.stdin, output: process.stdout, completer, historySize: 100 });
  process.stdout.write(`\n${renderBrand()}\n\nYour context, wherever you work.\n↑/↓ for history, Ctrl+C to quit\n\n`);
  try {
    while (true) {
      let line: string;
      try { line = await rl.question("> "); } catch { break; }
      if (!line.trim()) continue;
      try {
        const tokens = shellSplit(line);
        const command = tokens.shift();
        if (!command) continue;
        if (command === "exit" || command === "quit") break;
        if (command === "help") {
          process.stdout.write("Enter a tool name or run `tools` to list everything.\n");
          continue;
        }
        if (command === "tools") {
          for (const tool of liveTools) process.stdout.write(`${tool.name.padEnd(30)} ${tool.description ?? ""}\n`);
          continue;
        }
        if (command === "refresh") {
          liveTools = await listAllTools(client);
          process.stdout.write(`Loaded ${liveTools.length} tools.\n`);
          continue;
        }
        const tool = liveTools.find((entry) => entry.name === command);
        if (!tool) {
          process.stderr.write(`Unknown command: ${command}. Run tools to list available commands.\n`);
          continue;
        }
        const parsed = await parseToolArguments(tokens, tool.inputSchema, {
          allowMissingRequired: true,
        });
        const args = await fillMissingArguments(rl, tool, parsed);
        const result = await client.callTool({ name: tool.name, arguments: args });
        printToolResult(result, false);
      } catch (error) {
        process.stderr.write(`${errorMessage(error)}\n`);
      }
    }
  } finally {
    rl.close();
  }
}
