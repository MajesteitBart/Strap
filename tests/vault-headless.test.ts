import test from "node:test";
import assert from "node:assert/strict";
import * as grants from "../lib/vault-grants.ts";
import { buildVaultListing, canListVault, isVaultListingBatch, MAX_REVEALABLE_BY, MAX_VAULT_FILTER_LENGTH, MAX_VAULT_LISTING_ITEMS, parseVaultListingArgs, vaultToolsFor, VaultListingError } from "../lib/vault-tools.ts";

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
  const listing = buildVaultListing({ profileType: "personal", folders, items, keys, caller: null });
  assert.deepEqual(listing.folders, [{ id: folderId, name: "share-artifact", description: "Artifact uploads", itemCount: 1 }]);
  assert.deepEqual(listing.items.map((item) => item.revealableBy.map((key) => key.name)), [["Artifact CI"], ["Billing"]]);
  assert.equal(listing.items[0]?.schemaLine, `# @sensitive @required\nSHARE_ARTIFACT_SERVER=strap("secret://${itemId}")`);
  assert.equal(listing.items[1]?.envName, "STRIPE_LIVE_KEY");
  assert.equal("grantedToThisKey" in listing.items[0]!, false);
  assert.equal(JSON.stringify(listing).includes("ciphertext"), false);

  const filtered = buildVaultListing({ profileType: "personal", folders, items, keys, caller: { keyId: "k1", vaultItemIds: [], vaultFolderIds: [folderId] }, folder: "SHARE-ARTIFACT", query: "upload" });
  assert.deepEqual(filtered.items.map((item) => [item.name, item.grantedToThisKey]), [["SHARE_ARTIFACT_SERVER", true]]);
  assert.equal(filtered.folders[0]?.grantedToThisKey, true);
  assert.deepEqual(buildVaultListing({ profileType: "personal", folders, items, keys, caller: null, query: "artifact server" }).items.map((item) => item.name), ["SHARE_ARTIFACT_SERVER"]);
  assert.throws(() => buildVaultListing({ profileType: "personal", folders, items, keys, caller: null, folder: "missing" }), (error: unknown) =>
    error instanceof VaultListingError && /Available folders: "share-artifact"/.test(error.message));
});

test("listings return pages of secrets with a cursor to continue", () => {
  const many = Array.from({ length: MAX_VAULT_LISTING_ITEMS + 1 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, folderId: null, name: `SECRET_${String(index).padStart(4, "0")}`, description: "", updatedAt: "2026-10-01T00:00:00.000Z",
  }));
  const full = buildVaultListing({ profileType: "personal", folders: [], items: many, keys: [], caller: null });
  assert.equal(full.items.length, MAX_VAULT_LISTING_ITEMS);
  assert.equal(full.truncated, true);
  assert.match(full.note, /call again with cursor/);
  // The cursor resumes after the last secret returned.
  const last = many[MAX_VAULT_LISTING_ITEMS - 1]!;
  assert.deepEqual(parseVaultListingArgs({ cursor: full.nextCursor }).cursor, { name: last.name, id: last.id });
  const few = buildVaultListing({ profileType: "personal", folders: [], items: many.slice(0, 3), keys: [], caller: null });
  assert.equal(few.truncated, false);
  assert.equal(few.nextCursor, null);
  // When the read stopped early, the cursor resumes after the last secret read, even if none matched.
  const unmatched = buildVaultListing({ profileType: "personal", folders: [], items: many.slice(0, 3), keys: [], caller: null, hasMoreRows: true, query: "nothing matches this" });
  assert.equal(unmatched.items.length, 0);
  assert.deepEqual(parseVaultListingArgs({ cursor: unmatched.nextCursor }).cursor, { name: many[2]!.name, id: many[2]!.id });
  for (const cursor of ["not-base64-json", Buffer.from(JSON.stringify(["x", "not-a-uuid"])).toString("base64url"), 7]) {
    assert.throws(() => parseVaultListingArgs({ cursor }), VaultListingError);
  }
  // Capped key reads are flagged separately and do not mark the secrets as truncated.
  const capped = buildVaultListing({ profileType: "personal", folders: [], items: many.slice(0, 3), keys: [], caller: null, keysTruncated: true });
  assert.equal(capped.truncated, false);
  assert.equal(capped.keysTruncated, true);
  // Folder counts from the database are used even when only some items were read.
  const big = { id: folderId, name: "big", description: "" };
  assert.equal(buildVaultListing({ profileType: "personal", folders: [big], items: [], keys: [], caller: null, itemCounts: new Map([[folderId, 7000]]) }).folders[0]?.itemCount, 7000);
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
  const listing = buildVaultListing({ profileType: "personal", folders, items, keys, caller: { keyId: "k3", vaultItemIds: [], vaultFolderIds: [folderId] } });
  assert.deepEqual(listing.items[0]?.revealableBy.map((key) => key.id), ["k1", "k3"]);
  assert.equal(listing.items[0]?.grantedToThisKey, true);
  assert.deepEqual(listing.folders.map((folder) => folder.itemCount), [1, 0]);
  assert.throws(() => buildVaultListing({ profileType: "personal", folders, items, keys, caller: null, folder: "missing" }), (error: unknown) =>
    error instanceof VaultListingError && !/[\u0000-\u001f\u007f-\u009f]/.test(error.message) && error.message.includes('"ops"'));
});

test("folder lookup prefers IDs, filters are bounded and revealers are capped with a count", () => {
  const realId = "55555555-5555-4555-8555-555555555555";
  const decoyId = "66666666-6666-4666-8666-666666666666";
  // The decoy is named like the real folder's ID and sorts first by name.
  const folders = [{ id: decoyId, name: realId, description: "" }, { id: realId, name: "real", description: "" }];
  const items = [
    { id: itemId, folderId: realId, name: "REAL_SECRET", description: "", updatedAt: "2026-10-01T00:00:00.000Z" },
    { id: otherItemId, folderId: decoyId, name: "DECOY_SECRET", description: "", updatedAt: "2026-10-01T00:00:00.000Z" },
  ];
  const keys = Array.from({ length: 25 }, (_, index) => ({ id: `k${index}`, name: `Key ${index}`, prefix: `p${index}`, vaultItemIds: index === 3 ? [itemId] : [], vaultFolderIds: [realId] }));
  const listing = buildVaultListing({ profileType: "personal", folders, items, keys, caller: null, folder: realId });
  assert.deepEqual(listing.items.map((item) => item.name), ["REAL_SECRET"]);
  assert.equal(listing.items[0]?.revealableByCount, 25);
  assert.equal(listing.items[0]?.revealableBy.length, MAX_REVEALABLE_BY);
  assert.deepEqual(listing.items[0]?.revealableBy.slice(0, 5).map((key) => key.id), ["k0", "k1", "k2", "k3", "k4"]);
  assert.throws(() => parseVaultListingArgs({ query: "x".repeat(MAX_VAULT_FILTER_LENGTH + 1) }), VaultListingError);
  assert.throws(() => parseVaultListingArgs({ folder: "x".repeat(MAX_VAULT_FILTER_LENGTH + 1) }), VaultListingError);
  assert.deepEqual(parseVaultListingArgs({ folder: " real ", query: null }), { folder: "real", query: "", cursor: null });
});

test("colliding variable names get no schema line", () => {
  const items = [
    { id: itemId, folderId: null, name: "deploy-key", description: "", updatedAt: "2026-10-01T00:00:00.000Z" },
    { id: otherItemId, folderId: null, name: "deploy key", description: "", updatedAt: "2026-10-01T00:00:00.000Z" },
    { id: "77777777-7777-4777-8777-777777777777", folderId: null, name: "Other token", description: "", updatedAt: "2026-10-01T00:00:00.000Z" },
  ];
  const listing = buildVaultListing({ profileType: "personal", folders: [], items, keys: [], caller: null });
  assert.deepEqual(listing.items.map((item) => [item.envName, item.envNameConflict, item.schemaLine === null]), [
    ["DEPLOY_KEY", true, true],
    ["DEPLOY_KEY", true, true],
    ["OTHER_TOKEN", false, false],
  ]);
  // Without the colliding sibling the suggestion is usable again.
  const alone = buildVaultListing({ profileType: "personal", folders: [], items: [items[0]!, items[2]!], keys: [], caller: null });
  assert.equal(alone.items[0]?.envNameConflict, false);
  assert.equal(alone.items[0]?.schemaLine, `# @sensitive @required\nDEPLOY_KEY=strap("secret://${itemId}")`);
});

test("listings never suggest process-control variable names", () => {
  const items = [
    { id: itemId, folderId: null, name: "NODE_OPTIONS", description: "", updatedAt: "2026-10-01T00:00:00.000Z" },
    { id: otherItemId, folderId: null, name: "STRIPE_KEY", description: "", updatedAt: "2026-10-01T00:00:00.000Z" },
  ];
  const listing = buildVaultListing({ profileType: "personal", folders: [], items, keys: [], caller: null });
  assert.deepEqual(listing.items.map((item) => [item.envName, item.envNameReserved, item.schemaLine === null]), [
    ["NODE_OPTIONS", true, true],
    ["STRIPE_KEY", false, false],
  ]);
});

test("filters must be strings and unusual names need review", () => {
  assert.throws(() => parseVaultListingArgs({ folder: 17 }), /folder must be a string/);
  assert.throws(() => parseVaultListingArgs({ query: [] }), /query must be a string/);
  assert.throws(() => parseVaultListingArgs({ query: { words: "x" } }), VaultListingError);
  assert.deepEqual(parseVaultListingArgs({ folder: null, query: "" }), { folder: "", query: "", cursor: null });
  const items = [
    { id: itemId, folderId: null, name: "Deployment API", description: "", updatedAt: "2026-10-01T00:00:00.000Z" },
    { id: otherItemId, folderId: null, name: "Deployment token", description: "", updatedAt: "2026-10-01T00:00:00.000Z" },
  ];
  // Personal profile: only the owner names secrets, so lines are offered.
  const personal = buildVaultListing({ profileType: "personal", folders: [], items, keys: [], caller: null });
  assert.deepEqual(personal.items.map((item) => [item.envName, item.envNameNeedsReview, item.schemaLine === null]), [
    ["DEPLOYMENT_API", false, false],
    ["DEPLOYMENT_TOKEN", false, false],
  ]);
  // Company profile, or an unknown type: another manager may have chosen the names.
  for (const profileType of ["company", undefined]) {
    const shared = buildVaultListing({ profileType, folders: [], items, keys: [], caller: null });
    assert.deepEqual(shared.items.map((item) => [item.envNameNeedsReview, item.schemaLine]), [[true, null], [true, null]]);
  }
});
