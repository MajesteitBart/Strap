import { databaseUrl } from "./db-env.mts";
import { createConnection } from "../lib/db/connection.ts";

const connection = createConnection(databaseUrl(), { sslCa: process.env.DATABASE_SSL_CA });
try {
  await connection`select 1`;
  process.stdout.write("Postgres connection OK.\n");
} catch {
  process.stderr.write("Postgres connection failed. Check DATABASE_URL and database availability.\n");
  process.exitCode = 1;
} finally {
  await connection.end();
}
