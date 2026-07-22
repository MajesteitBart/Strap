---
id: T-007
name: Clean bootstrap state and complete release gates
status: done
workstream: WS-C
created: 2026-07-22T05:53:03Z
updated: 2026-07-22T07:54:41Z
linear_issue_id:
github_issue:
github_pr: https://github.com/MajesteitBart/Creed/pull/2
depends_on: [T-004 T-006]
conflicts_with: [BOOTSTRAP.md, .project/context, package scripts]
parallel: false
priority: high
estimate: L
operating_mode: multi-stream
story_id: US-005
acceptance_criteria_ids: [AC-001 AC-010]
---

# Task: Clean bootstrap state and complete release gates

## Description

Remove next-forge artifacts and stale references, update project context, run migration and repository quality gates, smoke-test UI, close Delano contracts, and prepare PR evidence.

## Acceptance Criteria

- [x] Current bootstrap and project context no longer claim next-forge is installed or required.
- [x] Supabase reset, tests, typecheck, lint, build, Delano validation, and UI smoke checks pass or have explicit environment blocker evidence.
- [x] The feature branch is intentionally committed, pushed, and opened as a draft PR to main.

## Traceability
- Story: US-005
- Acceptance criteria: AC-001 AC-010

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-22T07:54:41Z: Signed-in browser QA used the configured test account successfully. Connections and Vault render their new surfaces, while hosted CRUD is blocked because linked Supabase is behind local migrations 20260721160000, 20260722100000, and 20260722120000; the new APIs return 500 until migration deployment. The signed-in device-code form and invalid/expired-code state passed. T3 Preview remained unavailable, so QA used local Playwright CLI without exposing credentials.

- 2026-07-22T06:39:46Z: Committed 0b256d9 on headless-access-api-key-vault, pushed to origin, and opened draft PR #2 to main: https://github.com/MajesteitBart/Creed/pull/2

- 2026-07-22T06:38:31Z: Release gates passed: clean local Supabase reset, 138 tests, strict TypeScript, zero ESLint errors, production build, git diff check, and Delano validation. Public /device and signed route compilation were smoke-tested; T3 Preview interactive automation was explicitly blocked by connector authentication.

- 2026-07-22T06:18:05Z: Task started with `delano task start`.

- 2026-07-22T06:18:05Z: All implementation workstreams are complete; begin cleanup and release gates.
- 2026-07-22T05:53:03Z: Created from .project/templates/task.md by `delano task add`.
