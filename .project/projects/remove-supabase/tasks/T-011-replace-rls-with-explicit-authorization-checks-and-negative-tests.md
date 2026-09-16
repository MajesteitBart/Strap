---
id: T-011
name: Replace RLS with explicit authorization checks and negative tests
status: done
workstream: WS-C
created: 2026-09-13T17:49:31Z
updated: 2026-09-13T21:48:27Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-008, T-009, T-010]
conflicts_with: []
parallel: false
priority: high
estimate: XL
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Replace RLS with explicit authorization checks and negative tests

## Description
Build a matrix of the 45 verified active policies by table and operation, map each to a guard in `lib/authz/`, apply the guard in every repository call that previously ran under the session client, and write one negative test per matrix row. Drop the RLS statements and the `creed_role`, `creed_section_permission`, and `creed_type` helpers from the baseline.

## Acceptance Criteria
- [x] The matrix is stored for review under `.project/projects/remove-supabase/research/`.
- [x] Every row has a passing negative test in `tests/db/`.
- [x] Independent review is tracked separately in T-021 and remains required before production cutover.
- [x] `lib/strap-permissions.ts` remains the single TypeScript source for section permission semantics.

## Traceability
- Story: US-002, US-003
- Acceptance criteria: AC-003

## Technical Notes
Policy families: personal owner by `user_id`, profile member by `creed_members`, role `owner` or `admin`, section permission through `creed_member_section_permissions`, and service-only tables that no session may touch. Credential mode clamping at the MCP boundary stays as it is.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Implementation self-review complete; independent review remains T-021.
- [x] Docs updated

## Evidence Log

- 2026-09-13T21:48:27Z: All 45 policy-negative cases and persisted-row authorization tests pass. Independent release review is tracked by T-021 and required by T-017.

- 2026-09-13T21:47:31Z: Matrix and negative tests pass; independent review remains a release gate. No subagents are authorized.
- 2026-09-13: Planned from the Supabase surface inventory.
