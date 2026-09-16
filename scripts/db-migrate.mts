import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { databaseUrl } from "./db-env.mts";
import { createConnection } from "../lib/db/connection.ts";

const connection = createConnection(databaseUrl());
try {
  await migrate(drizzle(connection), { migrationsFolder: "db/migrations" });
  process.stdout.write("Database migrations applied.\n");
} catch (error) {
  // Driver errors can carry connection details or statement values.
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
  process.stderr.write(`Database migration failed (${code}).\n`);
  process.exitCode = 1;
} finally {
  await connection.end();
}
