import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const legacySubscriptionRoute = readFileSync(
  new URL("../server/api/app/legacy-subscriptions/route.ts", import.meta.url),
  "utf8",
);
const authorizeView = readFileSync(
  new URL("../lib/consent-pages.ts", import.meta.url),
  "utf8",
);
const authorizePage = readFileSync(
  new URL("../src/routes/authorize/index.tsx", import.meta.url),
  "utf8",
);
const authorizeDecision = readFileSync(
  new URL("../server/authorize/decision/route.ts", import.meta.url),
  "utf8",
);
const inviteSource = readFileSync(
  new URL("../lib/company-invites.ts", import.meta.url),
  "utf8",
);



test("legacy Stripe subscribers retain a self-service cancellation path", () => {
  assert.match(legacySubscriptionRoute, /cancelLegacySubscription\(\{ subscriptionId, secret, revalidate: verifyOwnership \}\)/);
  assert.match(legacySubscriptionRoute, /STRIPE_SECRET_KEY/);
  assert.match(legacySubscriptionRoute, /owner_user_id.*auth\.user\.id/);
});

test("persisted profiles can manage subscriptions even with no sections", () => {
  const settings = readFileSync(new URL("../components/strap/settings-screen.tsx", import.meta.url), "utf8");
  const account = readFileSync(new URL("../components/strap/account-screen.tsx", import.meta.url), "utf8");
  for (const screen of [settings, account]) {
    assert.doesNotMatch(screen, /sections\.length === 0[\s\S]{0,80}router\.replace/);
  }
  // The personal subscription belongs to the account, so it sits beside account deletion.
  assert.match(account, /LegacySubscriptionNotice scope="personal"/);
});

test("OAuth never issues an authorization code without a Creed grant", () => {
  assert.match(authorizeView, /if \(creeds\.length === 0\) return \{ kind: "setup-first"/);
  assert.match(authorizePage, /href="\/onboarding"/);
  assert.match(authorizeDecision, /if \(!target\)/);
  assert.doesNotMatch(authorizeDecision, /const creedGrants:[^\n]+\? \[/);
});


test("company invites reject personal Creed ids on create and accept", () => {
  assert.match(inviteSource, /if \(!\(await isCompanyCreed\(db, creedId\)\)\)/);
  assert.match(inviteSource, /if \(creed\?\.type !== "company"\) return null/);
});
