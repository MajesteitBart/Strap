type ToolResultLike = {
  content?: Array<Record<string, unknown> & { type?: string; text?: string }>;
  structuredContent?: unknown;
  toolResult?: unknown;
  isError?: boolean;
};

export function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function toolResultValue(result: ToolResultLike): unknown {
  if (result.structuredContent !== undefined) return result.structuredContent;
  if (result.toolResult !== undefined) return result.toolResult;
  const text = (result.content ?? [])
    .filter((entry) => entry.type === "text" && typeof entry.text === "string")
    .map((entry) => entry.text as string)
    .join("\n");
  if (text) {
    try { return JSON.parse(text) as unknown; } catch { return text; }
  }
  return result.content ?? result;
}

export function printToolResult(result: ToolResultLike, json: boolean): void {
  const value = toolResultValue(result);
  if (json || typeof value !== "string") writeJson(value);
  else process.stdout.write(`${value}\n`);
}
