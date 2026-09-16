import assert from "node:assert/strict";
import test from "node:test";
import { validateMigrationTarget } from "../lib/db/migration-target.ts";

const source = "postgres://reader:password@source.example.test/source";
const target = "postgres://writer:password@target.example.test:6543/rehearsal";

test("hosted imports require an exact separately confirmed destination", () => {
  assert.throws(() => validateMigrationTarget(source, target, ["--apply"]));
  for (const mismatch of ["target.example.test:6543/production", "target.example.test:5432/rehearsal", "other.example.test:6543/rehearsal"]) {
    assert.throws(() => validateMigrationTarget(source, target, ["--apply", "--target", mismatch]));
  }
  assert.deepEqual(validateMigrationTarget(source, target, ["--target", "target.example.test:6543/rehearsal", "--apply"]), {
    apply: true, destination: "target.example.test:6543/rehearsal",
  });
});

test("local count rehearsals remain the default and reject accidental source reuse", () => {
  assert.equal(validateMigrationTarget(source, "postgres://localhost/rehearsal", []).apply, false);
  assert.throws(() => validateMigrationTarget("postgres://localhost/source", "postgres://127.0.0.1:5432/source", []));
  assert.throws(() => validateMigrationTarget(source, source, ["--apply", "--target", "source.example.test:5432/source"]));
  assert.throws(() => validateMigrationTarget(source, target, ["--force"]));
  assert.throws(() => validateMigrationTarget(source, target, ["--target"]));
});
