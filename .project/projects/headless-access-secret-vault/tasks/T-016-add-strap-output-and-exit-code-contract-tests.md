---
id: T-016
name: Add Strap output and exit-code contract tests
status: done
workstream: WS-D
created: 2026-07-23T14:27:38Z
updated: 2026-07-23T19:15:06Z
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

# Task: Add Strap output and exit-code contract tests

## Description

Add command-level tests that prove the documented stdout, stderr, JSON, color, and exit-code contracts.

## Acceptance Criteria

- [x] Tests prove successful JSON output is written to stdout while diagnostics are written to stderr with no ANSI formatting outside a TTY.
- [x] Command-level tests exercise exit codes 0, 1, 2, and 3 with deterministic local fixtures.
- [x] Tool error results preserve their returned payload, emit the diagnostic separately, and exit with code 3.

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

- 2026-07-23T19:15:06Z: Added deterministic command-level fixtures proving JSON stdout, separate stderr diagnostics, no ANSI outside TTY, exit codes 0/1/2/3, and preserved MCP tool-error payloads. Typecheck, targeted ESLint, and 28/28 tests pass.

- 2026-07-23T19:10:27Z: Add deterministic command-level stdout, stderr, color, and exit-code coverage

- 2026-07-23T19:08:12Z: Readiness review passed: deterministic local CLI contract tests
- 2026-07-23T14:27:38Z: Created from .project/templates/task.md by `delano task add`.
