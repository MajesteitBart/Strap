import assert from "node:assert/strict";
import test from "node:test";
import { createConnection } from "../lib/db/connection.ts";

test("hosted connections enforce verified TLS despite URL overrides", async () => {
  const db = createConnection("postgres://user:password@database.example.test/db?sslmode=disable&ssl=false", { sslCa: "test certificate authority" });
  try {
    assert.deepEqual(db.options.ssl, { rejectUnauthorized: true, ca: "test certificate authority" });
    assert.equal(db.options.prepare, false);
    assert.equal(db.options.max, 1);
  } finally {
    await db.end();
  }
});

test("private certificate authorities are scoped to their connection", async () => {
  const db = createConnection("postgres://user:password@database.example.test/db");
  try {
    assert.deepEqual(db.options.ssl, { rejectUnauthorized: true });
  } finally {
    await db.end();
  }
});
