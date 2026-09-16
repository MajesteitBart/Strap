import "./db-env.mts";
import { createConnection } from "../lib/db/connection.ts";
import { exportSource, importSnapshot } from "../lib/db/migration.ts";

// The default is a read-only count rehearsal. --apply imports into an EMPTY
// local database. Production destinations require a separate cutover decision.
const sourceUrl = process.env.STRAP_SOURCE_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;
if (!sourceUrl || !targetUrl) throw new Error("STRAP_SOURCE_DATABASE_URL and DATABASE_URL are required.");
const sourceOrigin = new URL(sourceUrl), targetOrigin = new URL(targetUrl);
if (!["localhost", "127.0.0.1", "[::1]", "postgres"].includes(targetOrigin.hostname)) throw new Error("This rehearsal command only imports into local Postgres.");
if (sourceOrigin.host === targetOrigin.host && sourceOrigin.pathname === targetOrigin.pathname) throw new Error("Source and destination must differ.");
const source = createConnection(sourceUrl), target = createConnection(targetUrl);
try {
  const snapshot = await exportSource(source);
  const counts = process.argv.includes("--apply") ? await importSnapshot(target, snapshot) : {
    users: snapshot.users.length, accounts: snapshot.accounts.length,
    ...Object.fromEntries(Object.entries(snapshot.tables).map(([table,rows])=>[table,rows.length])),
  };
  process.stdout.write(JSON.stringify({ applied: process.argv.includes("--apply"), counts }, null, 2) + "\n");
} catch {
  process.stderr.write("Migration failed. No source data was changed. Inspect schema compatibility and destination emptiness without logging credentials or row values.\n");
  process.exitCode = 1;
} finally {
  await source.end(); await target.end();
}
