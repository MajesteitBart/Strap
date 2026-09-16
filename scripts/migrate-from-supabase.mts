import "./db-env.mts";
import { createConnection } from "../lib/db/connection.ts";
import { exportSource, importSnapshot } from "../lib/db/migration.ts";
import { validateMigrationTarget } from "../lib/db/migration-target.ts";

// The default is a read-only count rehearsal. --apply imports into an EMPTY
// database. Hosted destinations require an explicit --target host:port/database.
const sourceUrl = process.env.STRAP_SOURCE_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;
if (!sourceUrl || !targetUrl) throw new Error("STRAP_SOURCE_DATABASE_URL and DATABASE_URL are required.");
const { apply, destination } = validateMigrationTarget(sourceUrl, targetUrl, process.argv.slice(2));
const source = createConnection(sourceUrl, { sslCa: process.env.STRAP_SOURCE_DATABASE_SSL_CA });
const target = createConnection(targetUrl, { sslCa: process.env.DATABASE_SSL_CA });
try {
  const snapshot = await exportSource(source);
  const counts = apply ? await importSnapshot(target, snapshot) : {
    users: snapshot.users.length, accounts: snapshot.accounts.length,
    ...Object.fromEntries(Object.entries(snapshot.tables).map(([table,rows])=>[table,rows.length])),
  };
  process.stdout.write(JSON.stringify({ applied: apply, destination, counts }, null, 2) + "\n");
} catch {
  process.stderr.write("Migration failed. No source data was changed. Inspect schema compatibility and destination emptiness without logging credentials or row values.\n");
  process.exitCode = 1;
} finally {
  await source.end(); await target.end();
}
