// Local commands use this checkout's .env.local; CI uses explicit job variables.
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

if (!process.env.CI && existsSync(".env.local")) {
  Object.assign(process.env, parseEnv(readFileSync(".env.local", "utf8")));
}

export function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL in .env.local (or the CI environment).");
  return url;
}
