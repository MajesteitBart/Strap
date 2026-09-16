---
id: T-007
name: Port user profile, identity, and account lifecycle
status: done
workstream: WS-B
created: 2026-09-13T17:49:30Z
updated: 2026-09-13T21:47:29Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-004]
conflicts_with: []
parallel: true
priority: medium
estimate: M
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Port user profile, identity, and account lifecycle

## Description
Replace `user_metadata` and `identities` reads in `lib/user-name.ts`, `lib/strap-backend.ts`, and `lib/github-version-control.ts` with user and account columns. Replace `updateUser` in the profile and avatar routes, `admin.getUserById` in invites and member listings, `admin.deleteUser` in the account route, the auth probe in `app/api/health/route.ts`, and the provisioning in `ensurePersonalStrapId`.

## Acceptance Criteria
- [x] A user-set display name wins over the provider name after a new social login.
- [x] Member emails resolve for invites and member lists.
- [x] Account deletion cascades through every `user_id` foreign key and signs the user out.
- [x] Health reports the auth component from the users table.

## Traceability
- Story: US-001, US-002
- Acceptance criteria: AC-001

## Technical Notes
GitHub identity data came from Supabase identity linking, which the app already superseded with its own OAuth app. Drop the identity fallback rather than porting it.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-09-13T21:47:29Z: Local implementation verified: 283 tests, browser/API/MCP and import rehearsals; see updates/2026-09-13-local-runtime-verified.md.
- 2026-09-13: Planned from the Supabase surface inventory.

- 2026-09-13: Local implementation and checks verified; see updates/2026-09-13-local-runtime-verified.md. External provider/production checks are retained in T-016/T-017.
