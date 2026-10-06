import assert from "node:assert/strict";
import test from "node:test";
import { asc, desc, eq, sql } from "drizzle-orm";
import { creed_members, creed_proposals, creed_sections, creeds } from "../../db/schema/application.ts";
import { rateLimits, users } from "../../db/schema/auth.ts";
import { rowScope } from "../../lib/authz/policies.ts";
import { viewerContext } from "../../lib/db/context.ts";
import { decodeRow, decodeRows, jsonRow, jsonRows } from "../../lib/db/json-rows.ts";
import { createTestDatabase, databaseTestsEnabled } from "./harness.ts";

test("JSON rows decode to the values a plain select returns", { skip: !databaseTestsEnabled }, async (t) => {
  const { db, close } = await createTestDatabase();
  t.after(close);
  const owner = "66000000-0000-4000-8000-000000000001";
  const other = "66000000-0000-4000-8000-000000000002";
  const strap = "66000000-0000-4000-8000-000000000011";
  const otherStrap = "66000000-0000-4000-8000-000000000012";
  await db.insert(users).values([
    { id: owner, email: "json-owner@example.test", name: "Owner Ünicode \"quoted\"", displayName: "Own", image: null },
    { id: other, email: "json-other@example.test", name: "Other", avatarUrl: "https://example.test/a.png" },
  ]);
  await db.insert(creeds).values([
    { id: strap, type: "personal", name: "Mine", owner_user_id: owner },
    { id: otherStrap, type: "personal", name: "Theirs", owner_user_id: other },
  ]);
  await db.insert(creed_members).values([
    { creed_id: strap, user_id: owner, role: "owner" },
    { creed_id: otherStrap, user_id: other, role: "owner" },
  ]);
  const section = (creedId: string, userId: string, id: string, position: number, payload: unknown, archivedAt: string | null, editedAt: string) => ({
    creed_id: creedId, user_id: userId, section_id: id, position, kind: "rich-text", name: `Section ${id}`, accent: "blue", payload,
    last_edited_by: "Owner", last_edited_type: "user", archived_at: archivedAt, last_edited_at: editedAt,
  });
  await db.insert(creed_sections).values([
    section(strap, owner, "section-b", 1, { content: { type: "doc", content: [{ type: "text", text: "✓ \"x\"\n" }] }, list: [1, 2.5, null, true] }, null, "2026-09-01 10:00:00.123456+00"),
    section(strap, owner, "section-a", 0, {}, "2026-09-02 08:00:00+00", "2026-09-02 11:30:00+02"),
    // A JSON string payload goes through the same double decode on both paths.
    section(strap, owner, "section-c", 2, "123", null, "2026-09-03 00:00:00.5+00"),
    section(otherStrap, other, "section-z", 0, { secret: true }, null, "2026-09-04 00:00:00+00"),
  ]);
  for (let index = 0; index < 4; index += 1) {
    await db.insert(creed_proposals).values({
      id: `proposal-${index}`, creed_id: strap, user_id: owner, section_id: "section-a", section_name: "A", accent: "blue",
      agent_name: "Agent", change_type: "update", reason: "r", impact: "low", confidence: "low", draft: { n: index },
      base_revision: index === 2 ? null : index, created_at: `2026-09-0${index + 1} 10:00:00+00`, updated_at: `2026-09-0${index + 1} 10:00:00+00`,
    });
  }
  await db.insert(rateLimits).values({ key: "json-rows", count: 3, lastRequest: 1_790_000_000_123 });

  const select = async (expression: ReturnType<typeof sql>) => {
    const [row] = await db.execute<{ value: unknown }>(sql`select ${expression} as value`);
    return row.value;
  };

  await t.test("text timestamps, jsonb, integers, booleans and nulls", async () => {
    const where = eq(creed_sections.creed_id, strap);
    const plain = await db.select().from(creed_sections).where(where).orderBy(asc(creed_sections.position));
    const json = await select(jsonRows(creed_sections, { where, orderBy: asc(creed_sections.position) }));
    assert.deepEqual(decodeRows(creed_sections, json), plain);
    assert.equal(plain[2]?.payload, 123);
  });

  await t.test("Date timestamps and a column subset", async () => {
    const [plain] = await db.select().from(users).where(eq(users.id, owner));
    assert.deepEqual(decodeRow(users, await select(jsonRow(users, eq(users.id, owner)))), plain);
    const subset = decodeRow(users, await select(jsonRow(users, eq(users.id, other), ["name", "avatarUrl", "emailVerified"])));
    assert.deepEqual(subset, { name: "Other", avatarUrl: "https://example.test/a.png", emailVerified: false });
  });

  await t.test("bigint columns in number mode", async () => {
    const [plain] = await db.select().from(rateLimits).where(eq(rateLimits.key, "json-rows"));
    assert.deepEqual(decodeRow(rateLimits, await select(jsonRow(rateLimits, eq(rateLimits.key, "json-rows")))), plain);
  });

  await t.test("order and limit match the plain query", async () => {
    const where = eq(creed_proposals.creed_id, strap);
    const plain = await db.select().from(creed_proposals).where(where).orderBy(desc(creed_proposals.created_at)).limit(3);
    const json = await select(jsonRows(creed_proposals, { where, orderBy: desc(creed_proposals.created_at), limit: 3 }));
    assert.deepEqual(decodeRows(creed_proposals, json), plain);
    assert.deepEqual(plain.map((row) => row.id), ["proposal-3", "proposal-2", "proposal-1"]);
  });

  await t.test("no match gives null and an empty array", async () => {
    assert.equal(decodeRow(users, await select(jsonRow(users, eq(users.email, "missing@example.test")))), null);
    assert.deepEqual(decodeRows(creed_sections, await select(jsonRows(creed_sections, { where: sql`false`, orderBy: asc(creed_sections.position) }))), []);
  });

  await t.test("rowScope inside a JSON subquery hides other users' rows", async () => {
    const viewer = viewerContext(db, { userId: owner });
    const json = await select(jsonRows(creed_sections, { where: rowScope(viewer, creed_sections, "select"), orderBy: asc(creed_sections.section_id) }));
    assert.deepEqual(decodeRows(creed_sections, json).map((row) => row.section_id), ["section-a", "section-b", "section-c"]);
  });
});
