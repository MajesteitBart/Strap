export function isDatabaseTableMissingError(error: unknown) {
  if (error && typeof error === "object" && "code" in error && error.code === "42P01") return true;
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  return (
    message === "Database schema is not initialized." ||
    message.includes("schema cache") ||
    message.includes("Could not find the table") ||
    message.includes('relation "') ||
    message.includes("does not exist")
  );
}
