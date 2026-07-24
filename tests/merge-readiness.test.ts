import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const quotaSource = readFileSync(new URL("../lib/ai/credits.ts", import.meta.url), "utf8");
const companySource = readFileSync(
  new URL("../lib/company-provision.ts", import.meta.url),
  "utf8",
);
const companyMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260722100000_one_company_per_owner.sql",
    import.meta.url,
  ),
  "utf8",
);
const authorizePage = readFileSync(
  new URL("../app/authorize/page.tsx", import.meta.url),
  "utf8",
);
const authorizeDecision = readFileSync(
  new URL("../app/authorize/decision/route.ts", import.meta.url),
  "utf8",
);
const membershipSource = readFileSync(
  new URL("../lib/strap-membership.ts", import.meta.url),
  "utf8",
);
const inviteSource = readFileSync(
  new URL("../lib/company-invites.ts", import.meta.url),
  "utf8",
);

test("included AI is protected by burst and daily per-user limits", () => {
  assert.match(quotaSource, /scope: "included-ai"/);
  assert.match(quotaSource, /identifier: userId/);
  assert.match(quotaSource, /\.eq\("user_id", userId\)/);
  assert.match(quotaSource, /\.eq\("ai_mode", "credits"\)/);
  assert.match(quotaSource, /INCLUDED_AI_DAILY_LIMIT_USD/);
});

test("company provisioning collapses concurrent owner inserts", () => {
  assert.match(
    companyMigration,
    /create unique index if not exists creeds_one_company_per_owner[\s\S]+owner_user_id[\s\S]+where type = 'company'/,
  );
  assert.match(companySource, /createError\?\.code === "23505"/);
  assert.match(companySource, /concurrentShell/);
});

test("OAuth never issues an authorization code without a Creed grant", () => {
  assert.match(authorizePage, /if \(creeds\.length === 0\)/);
  assert.match(authorizePage, /href="\/onboarding"/);
  assert.match(authorizeDecision, /if \(!target\)/);
  assert.doesNotMatch(authorizeDecision, /const creedGrants:[^\n]+\? \[/);
});

test("company membership excludes personal-only membership rows", () => {
  assert.match(
    membershipSource,
    /hasCompanyMembership[\s\S]+\.from\("creeds"\)[\s\S]+\.eq\("type", "company"\)/,
  );
});

test("company invites reject personal Creed ids on create and accept", () => {
  assert.match(inviteSource, /if \(!\(await isCompanyCreed\(db, creedId\)\)\)/);
  assert.match(inviteSource, /if \(creed\?\.type !== "company"\) return null/);
});
