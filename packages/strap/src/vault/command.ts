import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { CliError } from "../errors.js";
import { writeJson } from "../terminal/output.js";
import { isRecord } from "../skills/bundle.js";
import { formatVaultSchema, isVaultInstanceId, terminalText } from "./schema.js";

export const VAULT_USAGE = `Usage: strap vault folders
       strap vault list [--folder NAME] [--query TEXT]
       strap vault schema [--folder NAME] [--query TEXT] [--instance ID]

Lists Vault metadata in the connected profile. Secret values are never shown.
list shows each secret's reference and which of your API keys can reveal it.
schema prints .env.schema lines for Varlock; append them to your schema and
resolve them with a Strap API key granted those secrets or their folder.
Requires a personal profile or a Company owner or admin role.
`;

export type VaultCommand = {
  action: "folders" | "list" | "schema";
  folder?: string;
  query?: string;
  instance?: string;
};

export function parseVaultCommand(args: string[]): VaultCommand {
  const action = args[0];
  if (action !== "folders" && action !== "list" && action !== "schema") throw new CliError(VAULT_USAGE, 2);
  const command: VaultCommand = { action };
  const seen = new Set<string>();
  for (let i = 1; i < args.length; i++) {
    const arg = args[i]!;
    const value = args[i + 1];
    if (seen.has(arg)) throw new CliError(`Repeated option ${arg}.`, 2);
    seen.add(arg);
    if (!value || value.startsWith("--")) throw new CliError(VAULT_USAGE, 2);
    i += 1;
    if (arg === "--folder" && action !== "folders") command.folder = value;
    else if (arg === "--query" && action !== "folders") command.query = value;
    else if (arg === "--instance" && action === "schema") {
      if (!isVaultInstanceId(value)) throw new CliError("--instance must be a Varlock @initStrap id such as personal or company.", 2);
      command.instance = value;
    } else throw new CliError(VAULT_USAGE, 2);
  }
  return command;
}

type Folder = { id: string; name: string; description: string; itemCount: number };
type Key = { id: string; name: string; prefix: string };
type Item = {
  id: string;
  reference: string;
  name: string;
  description: string;
  folder: { id: string; name: string } | null;
  envName: string;
  revealableBy: Key[];
  /** All keys that can reveal the secret; revealableBy may list only the first ones. */
  revealableByCount: number;
  /** Someone else may have chosen this name, so its schema line starts commented out. */
  needsReview: boolean;
};

function text(value: unknown): value is string {
  return typeof value === "string";
}

function parseListing(data: unknown): { folders: Folder[]; items: Item[] } {
  if (!isRecord(data) || !Array.isArray(data.folders) || !Array.isArray(data.items)) throw new CliError("Strap returned an invalid Vault listing.");
  const folders = data.folders.map((entry: unknown) => {
    if (!isRecord(entry) || !text(entry.id) || !text(entry.name) || !text(entry.description) || typeof entry.itemCount !== "number") throw new CliError("Strap returned an invalid Vault folder.");
    return { id: entry.id, name: entry.name, description: entry.description, itemCount: entry.itemCount };
  });
  const items = data.items.map((entry: unknown) => {
    if (!isRecord(entry) || !text(entry.id) || !text(entry.name) || !text(entry.description) || !text(entry.envName) || !Array.isArray(entry.revealableBy)) throw new CliError("Strap returned an invalid Vault item.");
    if (!text(entry.reference) || !/^secret:\/\/[0-9a-f-]{36}$/.test(entry.reference)) throw new CliError("Strap returned an invalid secret reference.");
    const folder = isRecord(entry.folder) && text(entry.folder.id) && text(entry.folder.name) ? { id: entry.folder.id, name: entry.folder.name } : null;
    const revealableBy = entry.revealableBy.filter((key: unknown): key is Key => isRecord(key) && text(key.id) && text(key.name) && text(key.prefix));
    const revealableByCount = typeof entry.revealableByCount === "number" && entry.revealableByCount >= revealableBy.length ? entry.revealableByCount : revealableBy.length;
    // Servers that do not send the flag get the safe default.
    const needsReview = entry.envNameNeedsReview !== false;
    return { id: entry.id, reference: entry.reference, name: entry.name, description: entry.description, folder, envName: entry.envName, revealableBy, revealableByCount, needsReview };
  });
  return { folders, items };
}

async function listVault(client: Client, command: VaultCommand) {
  const args: Record<string, string> = {};
  if (command.folder) args.folder = command.folder;
  if (command.query) args.query = command.query;
  let result: Awaited<ReturnType<Client["callTool"]>>;
  try {
    result = await client.callTool({ name: "strap_list_vault_items", arguments: args });
  } catch (error) {
    // Tool errors carry Strap's own message, such as an unknown folder or a missing role.
    const message = error instanceof Error ? error.message.replace(/^MCP error -?\d+:\s*/, "") : "";
    throw new CliError(terminalText(message) || "Strap rejected the Vault request.", 3);
  }
  if (result.isError) throw new CliError("Strap rejected the Vault request.", 3);
  const content = Array.isArray(result.content) ? result.content : [];
  const item = content.find((entry: unknown) => isRecord(entry) && entry.type === "text");
  if (!isRecord(item) || !text(item.text)) throw new CliError("Strap returned no Vault data.");
  return parseListing(JSON.parse(item.text) as unknown);
}

export async function runVaultCommand(client: Client, command: VaultCommand, json: boolean): Promise<void> {
  const listing = await listVault(client, command);
  if (command.action === "folders") {
    if (json) return writeJson(listing.folders);
    if (!listing.folders.length) return void process.stdout.write("No Vault folders.\n");
    // Human-readable output passes every server-supplied field through terminalText.
    for (const folder of listing.folders) {
      process.stdout.write(`${terminalText(folder.name).padEnd(28)} ${String(folder.itemCount).padStart(3)} secret${folder.itemCount === 1 ? " " : "s"}  ${terminalText(folder.description)}\n`);
    }
    return;
  }
  if (command.action === "list") {
    if (json) return writeJson(listing.items);
    if (!listing.items.length) return void process.stdout.write("No matching Vault secrets.\n");
    for (const entry of listing.items) {
      process.stdout.write(`${terminalText(entry.name)}\n  ${entry.reference}${entry.folder ? `  folder: ${terminalText(entry.folder.name)}` : ""}\n`);
      if (entry.description) process.stdout.write(`  ${terminalText(entry.description)}\n`);
      const more = entry.revealableByCount - entry.revealableBy.length;
      const keys = entry.revealableBy.map((key) => `${terminalText(key.name)} (${terminalText(key.prefix)}…)`).join(", ") + (more > 0 ? `, and ${more} more` : "");
      process.stdout.write(`  Revealable by: ${keys || "no API key yet"}\n`);
    }
    return;
  }
  if (!listing.items.length) throw new CliError("No matching Vault secrets.", 3);
  const heading = `Strap Vault${command.folder ? `, folder ${command.folder}` : ""}${command.query ? `, matching "${command.query}"` : ""}`;
  let schema: string;
  try {
    schema = formatVaultSchema(listing.items, { instance: command.instance, heading });
  } catch (error) {
    throw new CliError(error instanceof Error ? error.message : "Could not format the schema.", 3);
  }
  const needsReview = listing.items.filter((entry) => entry.needsReview).map((entry) => entry.envName);
  if (json) return writeJson({ schema, items: listing.items.map(({ name, envName, reference, needsReview: review }) => ({ name, envName, reference, needsReview: review })) });
  process.stdout.write(schema);
  if (needsReview.length) {
    process.stderr.write(`${needsReview.length} line${needsReview.length === 1 ? " is" : "s are"} commented out until you review the variable name, because another owner or admin may have named these secrets: ${needsReview.join(", ")}. Uncomment only names you expect your application to read.\n`);
  }
}
