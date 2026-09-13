import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isOngoingSubscription, parseSubscriptionTarget, readLegacySubscriptions, requestLegacySubscription } from "../lib/legacy-subscriptions.ts";

const subscription = {
  id: "sub_fixture", status: "active", cancel_at_period_end: false,
  items: { data: [{ current_period_end: 1_800_000_000 }] },
};

test("subscription targets reject malformed input and prefer the canonical profile id", () => {
  for (const value of [null, [], "personal", {}, { scope: "company", strapId: "bad" }]) {
    assert.equal(parseSubscriptionTarget(value), null);
  }
  assert.deepEqual(parseSubscriptionTarget({ scope: "personal", subscriptionId: "sub_someone_else" }),
    { scope: "personal", strapId: null });
  const id = "00000000-0000-4000-8000-000000000001";
  assert.deepEqual(parseSubscriptionTarget({ scope: "company", creedId: id }), { scope: "company", strapId: id });
  assert.equal(parseSubscriptionTarget({ scope: "company", strapId: "bad", creedId: id }), null);
});

test("delinquent and paused subscriptions remain visible until Stripe ends them", () => {
  for (const status of ["active", "trialing", "past_due", "unpaid", "incomplete", "paused", "unknown"]) {
    assert.equal(isOngoingSubscription(status), true);
  }
  for (const status of ["canceled", "incomplete_expired"]) assert.equal(isOngoingSubscription(status), false);
});

test("Stripe reads use a bounded uncached request and return only safe status metadata", async () => {
  const result = await requestLegacySubscription({ subscriptionId: "sub_fixture", secret: "test-secret",
    fetcher: async (url, init) => {
      assert.equal(url, "https://api.stripe.com/v1/subscriptions/sub_fixture");
      assert.equal(init?.method, "GET");
      assert.equal(init?.cache, "no-store");
      assert.ok(init?.signal);
      assert.equal(new Headers(init?.headers).get("Stripe-Version"), "2025-06-30.basil");
      return Response.json({ ...subscription, customer: "cus_private", metadata: { private: "data" } });
    } });
  assert.deepEqual(result, { status: "active", cancelAtPeriodEnd: false,
    currentPeriodEnd: new Date(1_800_000_000_000).toISOString() });
});

test("cancellation only schedules the existing subscription without creating billing", async () => {
  const result = await requestLegacySubscription({ subscriptionId: "sub_fixture", secret: "test-secret", cancel: true,
    fetcher: async (_url, init) => {
      assert.equal(init?.method, "POST");
      assert.equal(String(init?.body), "cancel_at_period_end=true");
      return Response.json({ ...subscription, cancel_at_period_end: true });
    } });
  assert.equal(result?.cancelAtPeriodEnd, true);
});

test("invalid or unconfirmed Stripe responses cannot report cancellation success", async () => {
  for (const payload of [null, {}, subscription, { ...subscription, id: "sub_someone_else", cancel_at_period_end: true }]) {
    await assert.rejects(requestLegacySubscription({ subscriptionId: "sub_fixture", secret: "test-secret", cancel: true,
      fetcher: async () => Response.json(payload) }));
  }
});

test("upstream errors and malformed responses do not expose provider details", async () => {
  await assert.rejects(requestLegacySubscription({ subscriptionId: "sub_fixture", secret: "test-secret",
    fetcher: async () => Response.json({ error: { message: "private-provider-details" } }, { status: 401 }) }),
    (error: unknown) => error instanceof Error && !error.message.includes("private-provider-details"));
  await assert.rejects(requestLegacySubscription({ subscriptionId: "sub_fixture", secret: "test-secret",
    fetcher: async () => new Response("not JSON") }));
});

test("a Stripe 404 never confirms cancellation, including wrong-account or wrong-mode credentials", async () => {
  for (const cancel of [false, true]) {
    await assert.rejects(requestLegacySubscription({ subscriptionId: "sub_fixture", secret: "wrong-account-key", cancel,
      fetcher: async () => Response.json({ error: { code: "resource_missing" } }, { status: 404 }) }));
  }
});

test("one failed subscription cannot hide a healthy subscription from another profile", async () => {
  const candidates = [
    { subscriptionId: "sub_missing", subscription: { scope: "personal" as const, strapId: null,
      status: "active", cancelAtPeriodEnd: false, currentPeriodEnd: null } },
    { subscriptionId: "sub_fixture", subscription: { scope: "company" as const, strapId: "company-id",
      status: "active", cancelAtPeriodEnd: false, currentPeriodEnd: null } },
  ];
  for (const status of [404, 503]) {
    const result = await readLegacySubscriptions(candidates, "test-secret", async (url) =>
      String(url).endsWith("sub_missing") ? Response.json({}, { status }) : Response.json(subscription));
    assert.equal(result.subscriptions.length, 1);
    assert.equal(result.subscriptions[0].scope, "company");
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0].scope, "personal");
    assert.doesNotMatch(JSON.stringify(result), /sub_missing|sub_fixture|test-secret/);
  }
});

test("billing end dates support multiple items and reject invalid dates", async () => {
  const result = await requestLegacySubscription({ subscriptionId: "sub_fixture", secret: "test-secret",
    fetcher: async () => Response.json({ ...subscription,
      items: { data: [{ current_period_end: 1_700_000_000 }, { current_period_end: 1_800_000_000 }] } }) });
  assert.equal(result?.currentPeriodEnd, new Date(1_800_000_000_000).toISOString());
  const invalid = await requestLegacySubscription({ subscriptionId: "sub_fixture", secret: "test-secret",
    fetcher: async () => Response.json({ ...subscription, items: { data: [{ current_period_end: 1e100 }] } }) });
  assert.equal(invalid?.currentPeriodEnd, null);
});
