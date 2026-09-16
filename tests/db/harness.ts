// Each integration suite owns an ephemeral database; existing data is never truncated.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { randomBytes } from "node:crypto";
import { createConnection } from "../../lib/db/connection.ts";

export const databaseTestsEnabled = Boolean(process.env.DATABASE_URL);

export async function createTestDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for database integration tests.");
  const url = new URL(process.env.DATABASE_URL);
  if (!["localhost", "127.0.0.1", "[::1]", "postgres"].includes(url.hostname)) {
    throw new Error("Database tests require a local Postgres server.");
  }
  const databaseName = `strap_test_${randomBytes(10).toString("hex")}`;
  const admin = createConnection(url.toString());
  await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
  url.pathname = `/${databaseName}`;
  const connection = createConnection(url.toString());
  const db = drizzle(connection);
  async function close() {
    await connection.end();
    try {
      await admin.unsafe(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
    } finally {
      await admin.end();
    }
  }
  try {
    await migrate(db, { migrationsFolder: "db/migrations" });
  } catch (error) {
    await close();
    throw error;
  }
  return { db, connection, close };
}

export const sqlState = (code: string) => (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === code;
