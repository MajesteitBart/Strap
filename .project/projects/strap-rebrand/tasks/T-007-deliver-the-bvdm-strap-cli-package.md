---
id: T-007
name: Deliver the @bvdm/strap CLI package
status: done
workstream: WS-C
created: 2026-07-23T02:05:38Z
updated: 2026-07-23T02:52:16Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-006]
conflicts_with: []
parallel: false
priority: high
estimate: XL
operating_mode: multi-stream
story_id: US-004
acceptance_criteria_ids: [AC-006]
---

# Task: Deliver the @bvdm/strap CLI package

## Description

Implement the separate @bvdm/strap package and strap executable using the live MCP surface while preserving creed-cli compatibility. Consume the user-authored contract in `.project/projects/headless-access-secret-vault/workstreams/WS-D-strap-cli-package.md`; do not overwrite or redefine that file or its companion plan edit.

## Acceptance Criteria

- [x] Package metadata help and executable identify Strap.
- [x] CLI tests and typecheck pass and a packed tarball installs cleanly.
- [x] No npm publication occurs without explicit approval.

## Traceability
- Story: US-004
- Acceptance criteria: AC-006

## Technical Notes

- This task owns code/package implementation only. The headless-access WS-D artifact remains preserved as the source contract.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-23T02:52:16Z: @bvdm/strap@0.1.0 exposes only the strap bin, uses Strap copy/default origin/config/header, documents commands/security/exit codes, and preserves live creed_* protocol identifiers. Package typecheck and ESLint passed, 20/20 tests passed, npm pack included 51 intended files, and tarball install smoke returned Strap help plus version 0.1.0. No npm publish performed.

- 2026-07-23T02:45:34Z: T-006 dependency passed; implementing the separately installable @bvdm/strap package from the preserved WS-D contract.
- 2026-07-23T02:05:38Z: Created from .project/templates/task.md by `delano task add`.
