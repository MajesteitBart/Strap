---
id: T-008
name: Address PR review authorization and caching findings
status: done
workstream: WS-C
created: 2026-07-22T08:33:32Z
updated: 2026-07-22T08:39:47Z
linear_issue_id:
github_issue:
github_pr: https://github.com/MajesteitBart/Creed/pull/2
depends_on: [T-007]
conflicts_with: [app/mcp/route.ts, next.config.ts, tests]
parallel: false
priority: high
estimate: M
operating_mode: multi-stream
story_id: US-003
acceptance_criteria_ids: [AC-002, AC-010]
---

# Task: Address PR review authorization and caching findings

## Description

Resolve all actionable automated PR review findings before merge.

## Acceptance Criteria

- [x] Company and Personal credential ceilings are enforced in execution and advertised policy, and /vault receives authenticated no-store headers.
- [x] Focused tests plus repository typecheck, lint, build, and Delano validation pass.

## Traceability
- Story: US-003
- Acceptance criteria: AC-002, AC-010

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-22T08:39:47Z: Credential modes now stay explicit through MCP dispatch, company writes clamp execution with permissionCeiling, proposal-mode state remains writable and forces Personal proposals, /vault is private no-store, focused tests pass, 140 repository tests pass, strict TypeScript passes, lint has zero errors, production build passes, and Delano validation reports zero errors or warnings.

- 2026-07-22T08:33:32Z: Four unresolved automated review threads require code changes before merge.
- 2026-07-22T08:33:32Z: Created from .project/templates/task.md by `delano task add`.
