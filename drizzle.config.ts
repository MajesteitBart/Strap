import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./scripts/db-env.mts";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema/*.ts",
  out: "./db/migrations",
  dbCredentials: { url: databaseUrl() },
});
