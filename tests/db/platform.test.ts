import assert from "node:assert/strict";
import test from "node:test";
import { authorizeMaintenance } from "../../lib/authz/maintenance.ts";
import { readAvatar, saveAvatar } from "../../lib/db/repositories/avatars.ts";
import { pruneActivity, pruneExpiredAuthorizations } from "../../lib/db/repositories/maintenance.ts";
import { vaultCreate, vaultDelete, vaultList, vaultReveal, vaultUpdate } from "../../lib/db/repositories/vault.ts";
import { createTestDatabase, databaseTestsEnabled } from "./harness.ts";

test("Vault, avatars and retention preserve their access boundaries", { skip: !databaseTestsEnabled }, async t => {
  const { db, connection: sql, close } = await createTestDatabase(); t.after(close);
  const previous = process.env.STRAP_VAULT_SECRET;
  process.env.STRAP_VAULT_SECRET = "local-test-vault-key-with-at-least-32-characters";
  t.after(() => { if (previous === undefined) delete process.env.STRAP_VAULT_SECRET; else process.env.STRAP_VAULT_SECRET = previous; });
  const owner = "62000000-0000-4000-8000-000000000001", member = "62000000-0000-4000-8000-000000000002";
  await sql`insert into users(id,email,name) values (${owner},'owner@example.test','Owner'),(${member},'member@example.test','Member')`;
  const [{ id: company }] = await sql`select provision_company_creed(${owner}) as id`;
  await sql`insert into creed_members(creed_id,user_id,role) values (${company},${member},'member')`;
  await t.test("Vault ciphertext is bound to the item and plaintext requires a successful audit", async () => {
    const row = await vaultCreate(db, { userId: owner }, { creedId: company, name: "Test", description: "", secret: "fixture-secret" });
    const [stored] = await sql`select secret_ciphertext from creed_vault_items where id=${row.id}`;
    assert.equal(stored.secret_ciphertext.includes("fixture-secret"), false);
    assert.equal(JSON.stringify(await vaultList(db, { userId: owner }, company)).includes("ciphertext"), false);
    await assert.rejects(vaultList(db, { userId: member }, company));
    await assert.rejects(vaultReveal(db, { userId: owner }, row.id, async()=>{ throw new Error("audit down"); }), { status: 503 });
    await assert.rejects(vaultReveal(db, { userId: member }, row.id, async()=>{}));
    let audited = false;
    const revealed = await vaultReveal(db, { userId: owner }, row.id, async()=>{ audited = true; });
    assert.equal(audited, true); assert.equal(revealed.secret, "fixture-secret");
    await vaultUpdate(db, { userId: owner }, { itemId: row.id, name: "Rotated", description: "", secret: "new-fixture" });
    assert.equal((await vaultReveal(db, { userId: owner }, row.id, async()=>{})).secret, "new-fixture");
    await assert.rejects(vaultDelete(db, { userId: member }, row.id));
    await vaultDelete(db, { userId: owner }, row.id);
  });
  await t.test("avatar writes require self or a Company manager and validate image bytes", async () => {
    const png = Buffer.from("89504e470d0a1a0a", "hex");
    await assert.rejects(saveAvatar(db, { userId: member }, "personal", owner, png, "image/png"));
    await assert.rejects(saveAvatar(db, { userId: member }, "company", company, png, "image/png"));
    await assert.rejects(saveAvatar(db, { userId: owner }, "personal", owner, Buffer.from("<svg>"), "image/png"));
    const url = await saveAvatar(db, { userId: owner }, "company", company, png, "image/png");
    assert.match(url, /\?v=[a-f\d]{64}$/);
    assert.deepEqual((await readAvatar(db, "company", company))?.body, png);
  });
  await t.test("maintenance requires its dedicated secret and prunes only records over 90 days", async () => {
    const secret = "maintenance-test-key-with-at-least-32-characters";
    assert.equal(authorizeMaintenance(null, secret), false);
    assert.equal(authorizeMaintenance("Bearer wrong", secret), false);
    assert.equal(authorizeMaintenance(`Bearer ${secret}`, undefined), false);
    assert.equal(authorizeMaintenance(`Bearer ${secret}`, secret), true);
    const now = new Date();
    for (const days of [91,90,89]) await sql`insert into creed_activity(id,creed_id,user_id,actor,actor_type,summary,status,created_at) values (${String(days)},${company},${owner},'Owner','user','event','direct',${new Date(now.getTime()-days*86400000).toISOString()})`;
    assert.equal(await pruneActivity(db, now), 1);
    assert.equal(await pruneActivity(db, now), 0);
    await sql`insert into oauth_clients(client_id) values ('retention')`;
    for (const offset of [-1, 1]) {
      const expires = new Date(now.getTime() + offset * 60000).toISOString();
      await sql`insert into oauth_device_authorizations(device_code_hash,user_code_hash,client_id,expires_at) values (${String(offset)},${String(offset)},'retention',${expires})`;
      await sql`insert into oauth_authorization_codes(code_hash,client_id,user_id,redirect_uri,code_challenge,expires_at) values (${String(offset)},'retention',${owner},'http://localhost/callback','challenge',${expires})`;
    }
    assert.deepEqual(await pruneExpiredAuthorizations(db, now), { device: 1, codes: 1 });
    assert.deepEqual(await pruneExpiredAuthorizations(db, now), { device: 0, codes: 0 });
  });
});
