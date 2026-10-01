/**
 * Read the canonical browser/API field while accepting the deployed Creed
 * compatibility field. Persistence and authorization continue to use the
 * existing internal Creed id.
 */
export function readStrapId(
  input: { strapId?: unknown; creedId?: unknown } | null | undefined,
): string | null {
  const value = input?.strapId ?? input?.creedId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Parses a JSON object body. Invalid JSON, null, arrays and primitives return null. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  const value: unknown = await request.json().catch(() => null);
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
