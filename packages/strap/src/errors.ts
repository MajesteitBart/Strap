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

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
