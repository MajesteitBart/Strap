import { drizzle } from "drizzle-orm/postgres-js";
import "server-only";
import { createConnection } from "./connection.ts";

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required.");
  return drizzle(createConnection(url));
}

// Lazy initialization keeps public routes and builds independent of the DB.
let database: ReturnType<typeof connect> | undefined;
export function getDatabase() {
  return database ??= connect();
}

export type Database = ReturnType<typeof getDatabase>;
