import { CliError } from "../errors.js";
import {
  ATTRIBUTABLE_AGENT_IDS,
  type AttributableAgentId,
} from "../agent-ids.js";

export { ATTRIBUTABLE_AGENT_IDS } from "../agent-ids.js";

export type GlobalOptions = {
  args: string[];
  agent?: AttributableAgentId;
  server?: string;
  json: boolean;
  quiet: boolean;
};

function optionValue(args: string[], index: number, name: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new CliError(`${name} requires a value.`, 2);
  }
  return value;
}

export function parseGlobalOptions(argv: string[]): GlobalOptions {
  const args: string[] = [];
  let agent: string | undefined;
  let server: string | undefined;
  let json = false;
  let quiet = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--json") {
      json = true;
      continue;
    }
    if (value === "--quiet") {
      quiet = true;
      continue;
    }
    if (value === "--agent") {
      agent = optionValue(argv, index, "--agent");
      index += 1;
      continue;
    }
    if (value?.startsWith("--agent=")) {
      agent = value.slice("--agent=".length);
      if (!agent) throw new CliError("--agent requires a value.", 2);
      continue;
    }
    if (value === "--server") {
      server = optionValue(argv, index, "--server");
      index += 1;
      continue;
    }
    if (value?.startsWith("--server=")) {
      server = value.slice("--server=".length);
      if (!server) throw new CliError("--server requires a value.", 2);
      continue;
    }
    if (value !== undefined) args.push(value);
  }

  if (
    agent !== undefined &&
    !(ATTRIBUTABLE_AGENT_IDS as readonly string[]).includes(agent)
  ) {
    throw new CliError(
      `Unsupported --agent ID: ${agent}. Copy the exact command from strap.bvdm.ai/connections.`,
      2,
    );
  }

  return {
    args,
    ...(agent ? { agent: agent as AttributableAgentId } : {}),
    ...(server ? { server } : {}),
    json,
    quiet,
  };
}

export function validateServerUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CliError(`Invalid Strap MCP URL: ${value}`, 2);
  }
  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(
    url.hostname,
  );
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
    throw new CliError(
      "Strap requires HTTPS, except for an explicit localhost server.",
      2,
    );
  }
  return url.toString();
}
