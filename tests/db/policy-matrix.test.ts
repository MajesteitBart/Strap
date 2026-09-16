import { sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as tables from "../../db/schema/application.ts";
import { authorizeValues, rowScope, type Operation } from "../../lib/authz/policies.ts";
import { viewerContext } from "../../lib/db/context.ts";
import { createTestDatabase, databaseTestsEnabled } from "./harness.ts";

type Policy = { id: string; name: string; table: keyof typeof tables; operation: Operation | "all" };
const policies: Policy[] = JSON.parse(readFileSync(new URL("../../.project/projects/remove-supabase/research/authorization/policies.json", import.meta.url), "utf8"));

test("all 45 source policies reject a foreign user's row", { skip: !databaseTestsEnabled }, async t => {
  const { db, connection, close } = await createTestDatabase(); t.after(close);
  const owner = "63000000-0000-4000-8000-000000000001", outsider = "63000000-0000-4000-8000-000000000002";
  await connection`insert into users(id,name,email) values (${owner},'Owner','owner@example.test'),(${outsider},'Outsider','outsider@example.test')`;
  const [{ id: profile }] = await connection`select provision_company_creed(${owner}) as id`;
  const context = viewerContext(db, { userId: outsider });
  assert.equal(policies.length, 45);
  for (const policy of policies) await t.test(`${policy.id}: ${policy.name}`, async () => {
    const table = tables[policy.table] as PgTable;
    assert.ok(table);
    const operations: Operation[] = policy.operation === "all" ? ["select", "insert", "update", "delete"] : [policy.operation];
    for (const operation of operations) {
      // Supply a foreign row with every column used by a policy. Membership
      // subqueries still run against real persisted profiles and memberships.
      const rows = await db.execute(sql`select 1 from (select ${owner}::uuid as user_id, ${profile}::uuid as creed_id, ${profile}::uuid as id, ${profile}::uuid as token_id, 'visible'::text as section_id, null::timestamptz as deleted_at, 'content'::text as event_kind) as ${sql.identifier(policy.table)} where ${rowScope(context, table, operation)}`);
      assert.equal(rows.length, 0, `${policy.id}/${operation}`);
      if (operation === "insert" || operation === "update") await assert.rejects(authorizeValues(context, table, operation, { user_id: owner, creed_id: profile }));
    }
  });
});
