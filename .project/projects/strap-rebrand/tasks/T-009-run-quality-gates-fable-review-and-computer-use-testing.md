---
id: T-009
name: Run quality gates Fable review and computer-use testing
status: done
workstream: WS-D
created: 2026-07-23T02:05:38Z
updated: 2026-07-24T12:36:02Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-008]
conflicts_with: []
parallel: false
priority: high
estimate: L
operating_mode: multi-stream
story_id: US-005
acceptance_criteria_ids: [AC-008]
---
# Task: Run quality gates Fable review and computer-use testing

## Description

Run focused/full automated checks, mechanical brand audit, independent Fable review, and computer-use desktop/mobile browser smoke with evidence.

## Acceptance Criteria

- [x] Root and CLI automated checks pass with zero new critical defects.
- [x] Fable blockers are resolved or explicitly recorded.
- [x] Computer-use covers required public and available authenticated routes with console/network evidence.
- [x] Delano evidence is complete and the project is ready for operator-gated release.
- [x] A checked-in brand-audit script and reviewed internal-identifier allowlist pass with no unclassified customer-visible Creed references.
- [x] Legacy creed.md MCP/OAuth origin requirements and external email/domain/package actions are explicit release-gate items.

## Traceability

- Story: US-005
- Acceptance criteria: AC-008

## Technical Notes

- The allowlist must map each retained occurrence to D-004/D-011 categories and must not allow customer-visible copy by broad directory or file glob.

## Definition of Done

- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-24T20:20:00Z: Corrective follow-up: the original audit result below covered its configured 446-file surface, not every tracked file. The rename-completion audit now uses Git-index/current-worktree enumeration, case-insensitive content and path findings, exact classification fingerprints, and positive Strap assertions. The accepted GUI exception and original evidence remain unchanged.

- 2026-07-24T12:36:02Z: Resolved Delano viewer annotation c833f797-f598-45a5-afbb-50d67aa8325b: operator approval accepted; all acceptance criteria and definition-of-done checks are complete, so T-009 is closed.

- 2026-07-24T14:33:00Z: Bart manually approved and marked this task as complete.

- 2026-07-23T08:42:42Z: T3 Preview now verifies the production public homepage at mobile, tablet, and desktop widths with visible keyboard focus, clean network requests, and only a non-blocking report-only CSP warning. Computer Use authenticated-route coverage remains blocked by the unavailable native helper.
- 2026-07-23T03:21:53Z: All non-GUI gates pass, but Computer Use cannot connect to its native Windows helper, so required browser evidence and release readiness remain incomplete.
- 2026-07-23T03:21:38Z: Automated release evidence: brand audit 446 files/23 classified occurrences/22 exact entries; root tests 150/150; strict TypeScript pass; ESLint 0 errors/1 existing warning; final Next build pass with 96 routes; Strap CLI typecheck and 20/20 tests pass; pack/install smoke pass; grounded Fable release review PASS with no blockers and all actionable non-blocking findings resolved. Computer Use safety guidance loaded, but runtime bootstrap failed because the native Windows helper pipe was unavailable.
- 2026-07-23T02:58:35Z: Begin final brand audit, automated quality gates, Fable review, and computer-use testing.
- 2026-07-23T02:05:38Z: Created from .project/templates/task.md by `delano task add`.
