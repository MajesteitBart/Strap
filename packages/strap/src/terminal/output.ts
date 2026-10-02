type ToolResultLike = {
  content?: Array<Record<string, unknown> & { type?: string; text?: string }>;
  structuredContent?: unknown;
  toolResult?: unknown;
  isError?: boolean;
};

/**
 * JSON for the terminal. JSON.stringify escapes C0 controls but leaves DEL and
 * C1 (U+007F-U+009F) literal, and some terminals act on C1 OSC/CSI. Tool
 * results can carry text other users stored, so those are escaped too; the
 * output stays valid JSON with the same values.
 */
export function terminalJson(value: unknown): string {
  return (JSON.stringify(value, null, 2) ?? "null").replace(/[\u007f-\u009f]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

/** Plain text for the terminal: control characters other than newline and tab become "?". */
export function terminalPlainText(text: string): string {
  return text.replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, "?");
}

export function writeJson(value: unknown): void {
  process.stdout.write(`${terminalJson(value)}\n`);
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
  else process.stdout.write(`${terminalPlainText(value)}\n`);
}
