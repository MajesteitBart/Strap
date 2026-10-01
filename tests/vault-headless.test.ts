import test from "node:test";
import assert from "node:assert/strict";
import * as grants from "../lib/vault-grants.ts";
import { buildVaultListing, canListVault, isVaultListingBatch, vaultToolsFor, VaultListingError } from "../lib/vault-tools.ts";

const itemId = "11111111-1111-4111-8111-111111111111";
const otherItemId = "22222222-2222-4222-8222-222222222222";
const folderId = "33333333-3333-4333-8333-333333333333";

test("item grants are bounded, normalized, deduplicated and opt-in", () => {
  assert.deepEqual(grants.parseVaultItemGrants(undefined), []);
  assert.deepEqual(grants.parseVaultItemGrants([itemId, itemId]), [itemId]);
  for (const value of [null, "*", [null], ["not-a-uuid"], Array(101).fill(itemId)]) {
    assert.equal(grants.parseVaultItemGrants(value), undefined);
  }
  assert.equal(grants.parseVaultReference(`secret://${itemId}`), itemId);
  assert.equal(grants.parseVaultReference(`secret://${itemId}/field`), null);
});

test("folder grants follow the same bounds and folder ids distinguish absent from cleared", () => {
  assert.deepEqual(grants.parseVaultFolderGrants(undefined), []);
  assert.deepEqual(grants.parseVaultFolderGrants([folderId.toUpperCase(), folderId]), [folderId]);
  for (const value of [null, "*", [null], ["folder"], Array(101).fill(folderId)]) {
    assert.equal(grants.parseVaultFolderGrants(value), undefined);
  }
  assert.equal(grants.parseVaultFolderId(undefined), undefined);
  assert.equal(grants.parseVaultFolderId(null), null);
  assert.equal(grants.parseVaultFolderId(""), null);
  assert.equal(grants.parseVaultFolderId(folderId), folderId);
  assert.equal(grants.parseVaultFolderId("../folder"), false);
});

test("a grant covers an item directly or through its current folder", () => {
  const grant = { vaultItemIds: [itemId], vaultFolderIds: [folderId] };
  assert.equal(grants.vaultGrantCovers(grant, { id: itemId, folderId: null }), true);
  assert.equal(grants.vaultGrantCovers(grant, { id: otherItemId, folderId }), true);
  assert.equal(grants.vaultGrantCovers(grant, { id: otherItemId, folderId: null }), false);
  assert.equal(grants.vaultGrantCovers({ vaultItemIds: [], vaultFolderIds: [] }, { id: itemId, folderId }), false);
});

test("Vault discovery lists metadata for managers only and never carries values", () => {
  assert.equal(canListVault("owner"), true);
  assert.equal(canListVault("admin"), true);
  assert.equal(canListVault("member"), false);
  assert.deepEqual(vaultToolsFor(undefined, "owner"), []);
  assert.deepEqual(vaultToolsFor("profile", "member"), []);
  assert.equal(vaultToolsFor("profile", "admin")[0]?.name, "strap_list_vault_items");

  const folders = [{ id: folderId, name: "share-artifact", description: "Artifact uploads" }];
  const items = [
    { id: itemId, folderId, name: "SHARE_ARTIFACT_SERVER", description: "Upload host", updatedAt: "2026-10-01T00:00:00.000Z" },
    { id: otherItemId, folderId: null, name: "Stripe live key", description: "", updatedAt: "2026-10-01T00:00:00.000Z" },
  ];
  const keys = [
    { id: "k1", name: "Artifact CI", prefix: "strap_key_abc", vaultItemIds: [], vaultFolderIds: [folderId] },
    { id: "k2", name: "Billing", prefix: "strap_key_def", vaultItemIds: [otherItemId], vaultFolderIds: [] },
  ];
  const listing = buildVaultListing({ folders, items, keys, caller: null });
  assert.deepEqual(listing.folders, [{ id: folderId, name: "share-artifact", description: "Artifact uploads", itemCount: 1 }]);
  assert.deepEqual(listing.items.map((item) => item.revealableBy.map((key) => key.name)), [["Artifact CI"], ["Billing"]]);
  assert.equal(listing.items[0]?.schemaLine, `# @sensitive @required\nSHARE_ARTIFACT_SERVER=strap("secret://${itemId}")`);
  assert.equal(listing.items[1]?.envName, "STRIPE_LIVE_KEY");
  assert.equal("grantedToThisKey" in listing.items[0]!, false);
  assert.equal(JSON.stringify(listing).includes("ciphertext"), false);

  const filtered = buildVaultListing({ folders, items, keys, caller: { keyId: "k1", vaultItemIds: [], vaultFolderIds: [folderId] }, folder: "SHARE-ARTIFACT", query: "upload" });
  assert.deepEqual(filtered.items.map((item) => [item.name, item.grantedToThisKey]), [["SHARE_ARTIFACT_SERVER", true]]);
  assert.equal(filtered.folders[0]?.grantedToThisKey, true);
  assert.deepEqual(buildVaultListing({ folders, items, keys, caller: null, query: "artifact server" }).items.map((item) => item.name), ["SHARE_ARTIFACT_SERVER"]);
  assert.throws(() => buildVaultListing({ folders, items, keys, caller: null, folder: "missing" }), (error: unknown) =>
    error instanceof VaultListingError && /Available folders: "share-artifact"/.test(error.message));
});

test("Vault listings are rejected inside JSON-RPC batches", () => {
  const call = (name: string) => ({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: {} } });
  assert.equal(isVaultListingBatch([call("strap_list_vault_items")]), false);
  assert.equal(isVaultListingBatch([call("strap_list_vault_items"), call("strap_list_vault_items")]), true);
  assert.equal(isVaultListingBatch([call("read_strap"), call("strap_list_vault_items")]), true);
  assert.equal(isVaultListingBatch([call("read_strap"), call("strap_search")]), false);
  assert.equal(isVaultListingBatch([null, "x", call("strap_list_vault_items")]), true);
});

test("listings index grants once and keep error text inert", () => {
  const folders = [{ id: folderId, name: "ops", description: "" }, { id: "44444444-4444-4444-8444-444444444444", name: "evil\u001b]52;c;eA==\u0007", description: "" }];
  const items = [{ id: itemId, folderId, name: "OPS_TOKEN", description: "", updatedAt: "2026-10-01T00:00:00.000Z" }];
  const keys = [
    { id: "k1", name: "Both", prefix: "p1", vaultItemIds: [itemId, itemId], vaultFolderIds: [folderId] },
    { id: "k2", name: "None", prefix: "p2", vaultItemIds: [], vaultFolderIds: [] },
    { id: "k3", name: "Folder", prefix: "p3", vaultItemIds: [], vaultFolderIds: [folderId] },
  ];
  const listing = buildVaultListing({ folders, items, keys, caller: { keyId: "k3", vaultItemIds: [], vaultFolderIds: [folderId] } });
  assert.deepEqual(listing.items[0]?.revealableBy.map((key) => key.id), ["k1", "k3"]);
  assert.equal(listing.items[0]?.grantedToThisKey, true);
  assert.deepEqual(listing.folders.map((folder) => folder.itemCount), [1, 0]);
  assert.throws(() => buildVaultListing({ folders, items, keys, caller: null, folder: "missing" }), (error: unknown) =>
    error instanceof VaultListingError && !/[\u0000-\u001f\u007f-\u009f]/.test(error.message) && error.message.includes('"ops"'));
});
