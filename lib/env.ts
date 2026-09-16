export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET);
}

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  throw new Error("NEXT_PUBLIC_SITE_URL is not set. Set it to the deployed origin.");
}
