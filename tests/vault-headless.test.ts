import test from "node:test";
import assert from "node:assert/strict";
import * as grants from "../lib/vault-grants.ts";

const itemId = "11111111-1111-4111-8111-111111111111";

test("item grants are bounded, normalized, deduplicated and opt-in", () => {
  assert.deepEqual(grants.parseVaultItemGrants(undefined), []);
  assert.deepEqual(grants.parseVaultItemGrants([itemId, itemId]), [itemId]);
  for (const value of [null, "*", [null], ["not-a-uuid"], Array(101).fill(itemId)]) {
    assert.equal(grants.parseVaultItemGrants(value), undefined);
  }
  assert.equal(grants.parseVaultReference(`secret://${itemId}`), itemId);
  assert.equal(grants.parseVaultReference(`secret://${itemId}/field`), null);
});
