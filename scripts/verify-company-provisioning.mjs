// Creates and drops its own random local test database.
import "./db-env.mts";
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { createTestDatabase } from "../tests/db/harness.ts";
import { createConnection } from "../lib/db/connection.ts";
const { connection: sql, close } = await createTestDatabase();
try {
  const owner = randomUUID(), failedOwner = randomUUID();
  await sql`insert into users (id,email,name) values (${owner},'owner@example.invalid','Owner'),(${failedOwner},'failed@example.invalid','Failed')`;
  const [{ name }] = await sql`select current_database() as name`;
  const url = new URL(process.env.DATABASE_URL); url.pathname = '/' + name;
  const clients = Array.from({ length: 8 }, () => createConnection(url.toString()));
  let ids;
  try { ids = await Promise.all(clients.map(async client => (await client`select provision_company_creed(${owner}) as id`)[0].id)); }
  finally { await Promise.all(clients.map(client => client.end())); }
  assert.equal(new Set(ids).size,1);
  assert.equal((await sql`select count(*)::int as count from creed_members where creed_id=${ids[0]} and user_id=${owner} and role='owner'`)[0].count,1);
  await sql.begin(async tx=>{
    await tx`create function pg_temp.reject_membership() returns trigger language plpgsql as $$ begin raise exception 'fixture failure'; end $$`;
    await tx`create trigger reject_membership before insert on creed_members for each row execute function pg_temp.reject_membership()`;
    await assert.rejects(tx.savepoint(inner=>inner`select provision_company_creed(${failedOwner})`));
    assert.equal((await tx`select count(*)::int as count from creeds where owner_user_id=${failedOwner}`)[0].count,0);
    await tx`drop trigger reject_membership on creed_members`;
  });
  process.stdout.write("Company provisioning passed: eight retries, owner membership, and transaction rollback.\n");
} finally { await close(); }
