---
timestamp: 2026-09-13T09:49:29Z
status: in-progress
task: T-001
stream: WS-A
---

# Progress Update

## Completed
- Integrated the existing billing follow-up with current Strap paths and preserved all applied migration files byte-for-byte against main.
- Added authenticated owner-only legacy status and cancellation, current Company ownership checks, live provider status, bounded transport, retryable errors, and idempotent cancellation. The UI confirms cancellation before sending it and links to support when Stripe is unconfigured.
- Removed the Settings client redirect that blocked empty persisted profiles from reaching their settings. The application layout still enforces authentication and onboarding.
- Added a new service-role-only atomic Company provisioning migration. A complete isolated `npx supabase db reset --local --no-seed` applied all migrations. `node scripts/verify-company-provisioning.mjs supabase_db_strap-release-20260913` passed browser-role denial, eight concurrent calls returning one Company and owner membership, and transaction rollback on membership failure.
- Final local checks pass: 194 tests, strict TypeScript, ESLint, production build, brand audit, and Delano validation.
- Runtime API checks against isolated Supabase passed unauthenticated 401 responses, unrelated-user and Company-member denial, invalid target rejection, owner-only metadata, Personal and Company cancellation, and repeated cancellation. Stripe responses were controlled local fixtures; no real subscription was cancelled.
- T3 Preview exercised the signed-in owner Settings journey and explicit cancellation confirmation, showing the scheduled state with no observed runtime errors. At the observed 468px CSS viewport neither the page nor notice overflowed horizontally; desktop was also checked. Preview snapshots failed at the automation boundary, so this record does not claim captured screenshots or a verified 390px viewport.
- The completed first Codex review identified provider 404 handling and shared lookup failure. Both are repaired: a missing provider resource now fails closed, and each subscription resolves independently. Unit and local HTTP regressions confirm a 404 returns 502 on cancellation without changing local billing, while a failing Personal lookup leaves Company offboarding usable.
- A read-only production check found zero recorded ongoing legacy subscriptions in either billing table and confirmed the new provisioning RPC is absent. Production has no Stripe key configured.
- The second Codex review found that account and Company deletion could cascade away the last subscription reference. Both server deletion paths now require live non-renewal confirmation for every affected record. `node scripts/verify-legacy-deletion.mjs http://localhost:3102 .agents/logs/strap-verification/.env.local`, with the local-only Stripe fixture loaded into that disposable server, verified 409 responses for renewing billing, 502 for unconfirmed provider status, preserved accounts/Companies on refusal, and successful deletion after confirmed period-end cancellation or termination. The script creates and cleans up only its own synthetic user.

- The third Codex review found that Personal Settings discarded deletion blockers. The provider now preserves the server message, and the confirmation handler displays it in a toast while resetting its pending state. All 194 tests, TypeScript, lint, build and brand checks pass after the fix.

## In Progress
- Final-head pull-request checks and Codex review for PR 5.
- Production migration readiness for the configured Supabase instance.

## Blockers
- The checkout has application credentials but no management token or database password for its configured Supabase instance. The available CLI account cannot access that project. Requested secure local configuration from the maintainer; the additive migration must be applied before deploying the RPC caller.
- Real Stripe cancellation remains unverified: the checkout has no legacy Stripe secret. With no secret configured, the UI offers support rather than claiming cancellation succeeded.

## Next Actions
- Push the repaired feature branch and review PR 5. Apply the tested additive migration to the intended instance before merge/deployment, then verify production readiness.
