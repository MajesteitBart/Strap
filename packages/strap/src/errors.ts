export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode = 1,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "CliError";
  }
}

/**
 * Error text for the terminal. Server errors can echo data other users stored,
 * so control characters that start escape sequences (ESC, C1, BEL and the rest)
 * are replaced; newlines and tabs stay for multi-line usage messages.
 */
export function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, "?");
}
