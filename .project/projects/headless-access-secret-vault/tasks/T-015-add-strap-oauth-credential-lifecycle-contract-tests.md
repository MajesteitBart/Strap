---
id: T-015
name: Add Strap OAuth credential lifecycle contract tests
status: done
workstream: WS-D
created: 2026-07-23T14:27:38Z
updated: 2026-07-23T19:10:27Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: []
parallel: true
priority: high
estimate: M
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Add Strap OAuth credential lifecycle contract tests

## Description

Add focused automated coverage for the CLI OAuth callback, provider credential lifecycle, state validation, and best-effort revocation behavior without exposing credential values.

## Acceptance Criteria

- [x] Tests cover OAuth callback success, provider state and verifier persistence, credential invalidation, and rejection of invalid or mismatched authorization state.
- [x] Tests cover revocation success and failure behavior and assert refresh credentials are sent only in the revocation request body.
- [x] Tests do not print stored tokens or authorization codes and the package test suite passes.

## Traceability
- Story: none
- Acceptance criteria: none

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [ ] Docs updated

## Evidence Log

- 2026-07-23T19:10:27Z: Added five OAuth lifecycle tests covering callback success/error/no-store, state mismatch, provider persistence/invalidation, safe revocation body handling, and remote failure. Fixed stale in-memory credentials caused by mutating a shared empty fallback. Typecheck and 25/25 tests pass.

- 2026-07-23T19:08:49Z: Add deterministic OAuth callback, state, credential lifecycle, and revocation tests

- 2026-07-23T19:08:11Z: Readiness review passed: focused OAuth lifecycle tests with no production auth-policy change
- 2026-07-23T14:27:38Z: Created from .project/templates/task.md by `delano task add`.
