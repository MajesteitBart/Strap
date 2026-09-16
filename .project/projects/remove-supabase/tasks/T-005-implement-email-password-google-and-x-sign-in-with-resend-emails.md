---
id: T-005
name: Implement email, password, Google, and X sign-in with Resend emails
status: done
workstream: WS-B
created: 2026-09-13T17:49:29Z
updated: 2026-09-13T21:47:29Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-004]
conflicts_with: []
parallel: true
priority: medium
estimate: L
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Implement email, password, Google, and X sign-in with Resend emails

## Description
Configure `emailAndPassword` with `requireEmailVerification`, a custom `verify` that accepts bcrypt hashes and rehashes on success, `sendResetPassword`, and `emailVerification.sendVerificationEmail`. Configure the `google` and `twitter` providers with account linking for trusted providers. Move the two templates from `supabase/email-templates/` to `lib/email-templates/` and send through `lib/email.ts`. Register the new callback URLs with both OAuth apps.

## Acceptance Criteria
- [x] Verification and reset mail use the Resend adapter and redesigned templates; local tests capture both links. Real delivery is a T-016 release check.
- [x] Google and X providers are configured conditionally; signed local Google identity-linking tests pass. Real provider sign-in remains deferred in T-016.
- [x] Unknown-email reset and duplicate sign-up keep their anti-enumeration behaviour.
- [x] `tests/strap-theme-assets.test.ts` reads the templates from the new location.

## Traceability
- Story: US-001
- Acceptance criteria: AC-001

## Technical Notes
Do not await the email send inside the hook on serverless; use `void` and log failures. `bcryptjs` is a new dependency; justify it in the commit message.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-09-13T21:47:29Z: Local implementation verified: 283 tests, browser/API/MCP and import rehearsals; see updates/2026-09-13-local-runtime-verified.md.
- 2026-09-13: Planned from the Supabase surface inventory.

- 2026-09-13: Local implementation and checks verified; see updates/2026-09-13-local-runtime-verified.md. External provider/production checks are retained in T-016/T-017.
