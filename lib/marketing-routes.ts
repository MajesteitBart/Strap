
export const MARKETING_PREFIXES = [
  "/home",
  "/docs",
  "/learn",
  "/changelog",
  "/bench",
  "/examples",
  "/pricing",
  "/roadmap",
  "/privacy",
  "/terms",
  "/stack",
  "/login",
  "/signup",
  "/reset-password",
  "/mcp",
  // OAuth surface for MCP connect (route handlers that bypass the layout
  // anyway, listed for intent) plus discovery metadata.
  "/authorize",
  "/token",
  "/register",
  "/.well-known",
] as const;

export function isMarketingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return MARKETING_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
