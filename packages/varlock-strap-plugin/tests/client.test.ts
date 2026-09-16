import test from "node:test";
import assert from "node:assert/strict";
import { fetchStrapSecret, strapEndpoint, strapReference } from "../src/client.js";

const itemId = "11111111-1111-4111-8111-111111111111";
const token = `strap_key_${"x".repeat(43)}`;

test("only HTTPS origins and exact HTTP loopbacks can receive credentials", () => {
  for (const server of ["https://strap.example", "http://localhost:3210", "http://127.0.0.1:3210", "http://[::1]:3210"]) {
    assert.equal(strapEndpoint(server).pathname, "/api/strap/vault/reveal");
  }
  for (const server of ["http://strap.example", "https://user:pass@strap.example", "https://strap.example/mcp", "https://strap.example/?token=x", "https://strap.example/#x", "file:///tmp/foo", "http://localhost.evil.test", null]) {
    assert.throws(() => strapEndpoint(server), /HTTPS origin/);
  }
});

test("references identify one immutable item, without paths or queries", () => {
  assert.equal(strapReference(itemId), `secret://${itemId}`);
  assert.equal(strapReference(`secret://${itemId}`), `secret://${itemId}`);
  for (const value of ["DATABASE_URL", `secret://${itemId}/field`, `secret://${itemId}?x=1`, "", null]) {
    assert.throws(() => strapReference(value), /UUID/);
  }
});

test("reveal uses bounded, nonredirecting, uncached POST and preserves secret bytes", async () => {
  const result = await fetchStrapSecret({ token, reference: itemId }, async (url, init) => {
    assert.equal(String(url), "https://strap.bvdm.ai/api/strap/vault/reveal");
    assert.equal(init?.method, "POST");
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal);
    assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${token}`);
    assert.deepEqual(JSON.parse(String(init?.body)), { reference: `secret://${itemId}` });
    return Response.json({ secret: "  fixture\nvalue\n" });
  });
  assert.equal(result, "  fixture\nvalue\n");
});

test("network exceptions, response bodies and malformed payloads never enter errors", async () => {
  const marker = "private-upstream-fixture";
  const options = { token, reference: itemId };
  for (const status of [301, 400, 401, 403, 404, 429, 500, 503]) {
    await assert.rejects(fetchStrapSecret(options, async () => new Response(marker, { status })), (error: Error) => {
      assert.equal(error.message.includes(marker), false);
      assert.equal(error.message.includes(token), false);
      return true;
    });
  }
  await assert.rejects(fetchStrapSecret(options, async () => { throw new Error(`${marker} ${token}`); }), /Could not reach Strap/);
  for (const payload of [null, {}, { secret: 1 }, { secret: "x".repeat(16_385) }]) {
    await assert.rejects(fetchStrapSecret(options, async () => Response.json(payload)), /invalid reveal response/);
  }
  await assert.rejects(fetchStrapSecret(options, async () => new Response(marker)), /invalid reveal response/);
});

test("each resolution fetches again and validates before network access", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; return Response.json({ secret: `rotation-${calls}` }); };
  const options = { token, reference: itemId };
  assert.equal(await fetchStrapSecret(options, fetcher), "rotation-1");
  assert.equal(await fetchStrapSecret(options, fetcher), "rotation-2");
  await assert.rejects(fetchStrapSecret({ ...options, token: "wrong" }, fetcher));
  await assert.rejects(fetchStrapSecret({ ...options, reference: "wrong" }, fetcher));
  assert.equal(calls, 2);
});
