---
id: T-008
name: Build Drizzle repositories for profiles, sections, proposals, and activity
status: done
workstream: WS-C
created: 2026-09-13T17:49:30Z
updated: 2026-09-13T21:47:29Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-002, T-004]
conflicts_with: []
parallel: false
priority: high
estimate: XL
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Build Drizzle repositories for profiles, sections, proposals, and activity

## Description
Replace the PostgREST chains in `lib/strap-backend.ts`, `lib/strap-context.ts`, `lib/strap-membership.ts`, `lib/company-sections.ts`, `lib/welcome.ts`, and the section, proposal, state, straps, getting-started, onboarding, and claim routes. Introduce `lib/db/repositories/*.ts`, remove `SupabaseLikeClient`, and map Postgres `42P01` in `lib/strap-backend-errors.ts`.

## Acceptance Criteria
- [x] `/file` loads and saves Personal and Company state with the same JSON contract.
- [x] Section versions, restore, reorder, and proposal apply behave as before.
- [x] No PostgREST string-table chain or `SupabaseLikeClient` reference remains in the ported modules.
- [x] The shared state loader used by `/file` and `/api/app/state` is measured: ten warm SQL reads match the prior ten logical reads. Session/active-profile overhead and hosted latency are documented separately.

## Traceability
- Story: US-001, US-002
- Acceptance criteria: AC-001

## Technical Notes
Every repository function takes an explicit viewer or a service-context marker so T-011 can attach guards without another pass. Preserve `onConflict` targets: `creed_id`, `creed_id,section_id`, `creed_id,client_id`, `creed_id,connection_id`, `creed_id,user_id,section_id`, `user_id`, `user_id,provider`, `id`.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-09-13T21:47:29Z: Local implementation verified: 283 tests, browser/API/MCP and import rehearsals; see updates/2026-09-13-local-runtime-verified.md.

- 2026-09-13T20:45:55Z: Continue the authorized local runtime migration after the accepted local probe.
- 2026-09-13: Planned from the Supabase surface inventory.

- 2026-09-13: Local implementation and checks verified; see updates/2026-09-13-local-runtime-verified.md. External provider/production checks are retained in T-016/T-017.
