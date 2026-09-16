---
id: T-004
name: Install Better Auth with the Drizzle adapter and core tables
status: done
workstream: WS-B
created: 2026-09-13T17:49:29Z
updated: 2026-09-13T20:45:55Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-002]
conflicts_with: []
parallel: false
priority: high
estimate: L
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Install Better Auth with the Drizzle adapter and core tables

## Description
Add `better-auth`, `lib/auth/server.ts`, `lib/auth/client.ts`, and `app/api/auth/[...all]/route.ts`. Define `users`, `sessions`, `accounts`, and `verifications` with UUID ids and the extra user columns `display_name` and `avatar_url`. Re-point every `user_id` foreign key to `users.id`. This task is the probe: import one exported user with a bcrypt hash and a Google identity, then sign in both ways.

## Acceptance Criteria
- [x] Sign-up and sign-in work locally through the Better Auth handler.
- [x] The probe report covers bcrypt verification, synthetic Google account linking, and a Drizzle transaction against local Postgres. Live Google and hosted pooler verification remain in T-016, deferred by the owner.
- [x] `advanced.database.generateId` is `"uuid"` and imported ids are preserved in the local fixture.

## Traceability
- Story: US-001
- Acceptance criteria: AC-001

## Technical Notes
Map model names to `users`, `sessions`, `accounts`, `verifications`. Register `nextCookies` as the last plugin. Enable the cookie cache to limit session lookups per render. Record the go or no-go for the host and the library in `plan.md`.

## Definition of Done
- [x] Implementation complete
- [x] Local tests pass
- [x] Local probe reviewed; live-provider verification remains outstanding
- [x] Docs updated

## Evidence Log

- 2026-09-13T20:45:55Z: Local foundation probe passed. Owner explicitly directed continuing migration while skipping Google setup. Live provider and hosted pooler verification deferred to T-016; not claimed as passed.

- 2026-09-13T20:17:42Z: Owner requested skipping Google credential setup and the live provider rehearsal for now. Local synthetic tests remain valid; live verification is deferred, not passed.

- 2026-09-13T20:13:00Z: Local synthetic probe passes; real existing-Google callback and imported-user verification require GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and the registered localhost callback. Owner selected the existing app; credential setup requested.

- 2026-09-13T20:08:30Z: Synthetic tests pass; existing Google app selected, real callback/import verification pending credentials.

- 2026-09-13T20:08:30Z: Database foundation complete; local auth and repository probes implemented.
- 2026-09-13: Planned from the Supabase surface inventory.
