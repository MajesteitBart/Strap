import { readFile } from "node:fs/promises";
import { CliError } from "../errors.js";

export type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
};

type ParseToolArgumentOptions = {
  allowMissingRequired?: boolean;
};

function camelToKebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/_/g, "-").toLowerCase();
}

export function parseToolArgumentValue(
  value: string,
  schema: JsonSchema | undefined,
): unknown {
  let parsed: unknown = value;
  if (schema?.type === "integer") {
    const number = Number(value);
    if (!Number.isInteger(number)) throw new CliError(`Expected an integer, received ${value}.`, 2);
    parsed = number;
  } else if (schema?.type === "number") {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new CliError(`Expected a number, received ${value}.`, 2);
    parsed = number;
  } else if (schema?.type === "boolean") {
    if (["true", "yes", "1"].includes(value.toLowerCase())) parsed = true;
    else if (["false", "no", "0"].includes(value.toLowerCase())) parsed = false;
    else throw new CliError(`Expected a boolean, received ${value}.`, 2);
  } else if (schema?.type === "array" || schema?.type === "object") {
    try { parsed = JSON.parse(value) as unknown; } catch { throw new CliError(`Expected JSON for ${schema.type} value.`, 2); }
  }
  if (typeof parsed === "number") {
    if (schema?.minimum !== undefined && parsed < schema.minimum) throw new CliError(`Value must be at least ${schema.minimum}.`, 2);
    if (schema?.maximum !== undefined && parsed > schema.maximum) throw new CliError(`Value must be at most ${schema.maximum}.`, 2);
  }
  if (schema?.enum && !schema.enum.includes(parsed)) throw new CliError(`Expected one of: ${schema.enum.join(", ")}.`, 2);
  return parsed;
}

export async function parseToolArguments(
  tokens: string[],
  inputSchema: unknown,
  options: ParseToolArgumentOptions = {},
): Promise<Record<string, unknown>> {
  const schema = inputSchema as JsonSchema;
  const rawArgsIndex = tokens.indexOf("--args");
  if (rawArgsIndex >= 0) {
    if (tokens.length !== 2) throw new CliError("--args cannot be combined with other tool arguments.", 2);
    const raw = tokens[rawArgsIndex + 1];
    if (!raw) throw new CliError("--args requires a JSON object.", 2);
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      return parsed as Record<string, unknown>;
    } catch { throw new CliError("--args must contain a JSON object.", 2); }
  }
  const fileIndex = tokens.indexOf("--file");
  if (fileIndex >= 0) {
    if (tokens.length !== 2) throw new CliError("--file cannot be combined with other tool arguments.", 2);
    const path = tokens[fileIndex + 1];
    if (!path) throw new CliError("--file requires a path.", 2);
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
    } catch {
      throw new CliError("The argument file must contain valid JSON.", 2);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new CliError("The argument file must contain a JSON object.", 2);
    return parsed as Record<string, unknown>;
  }

  const byFlag = new Map<string, [string, JsonSchema]>();
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    byFlag.set(`--${camelToKebab(name)}`, [name, property]);
  }
  const result: Record<string, unknown> = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token?.startsWith("--")) throw new CliError(`Unexpected argument: ${token}.`, 2);
    if (token === "--json" || token === "--yes" || token === "--quiet") continue;
    const mapping = byFlag.get(token);
    if (!mapping) throw new CliError(`Unknown argument: ${token}. Use --args for raw JSON.`, 2);
    const [name, property] = mapping;
    if (property.type === "boolean") {
      result[name] = true;
      continue;
    }
    const value = tokens[index + 1];
    if (value === undefined) throw new CliError(`${token} requires a value.`, 2);
    result[name] = parseToolArgumentValue(value, property);
    index += 1;
  }
  const missing = options.allowMissingRequired
    ? []
    : (schema.required ?? []).filter((name) => result[name] === undefined);
  if (missing.length > 0) throw new CliError(`Missing required argument${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`, 2);
  return result;
}

export function shellSplit(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escaped = false;
  for (const character of input.trim()) {
    if (escaped) { current += character; escaped = false; continue; }
    if (character === "\\" && quote !== "'") { escaped = true; continue; }
    if (quote) { if (character === quote) quote = null; else current += character; continue; }
    if (character === "'" || character === '"') { quote = character; continue; }
    if (/\s/.test(character)) { if (current) { tokens.push(current); current = ""; } continue; }
    current += character;
  }
  if (quote) throw new CliError("Unclosed quote.", 2);
  if (escaped) current += "\\";
  if (current) tokens.push(current);
  return tokens;
}
