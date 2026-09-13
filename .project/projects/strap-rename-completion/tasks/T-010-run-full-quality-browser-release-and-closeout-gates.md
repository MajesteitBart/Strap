---
id: T-010
name: Run full quality browser release and closeout gates
status: done
workstream: WS-E
created: 2026-07-24T20:00:37Z
updated: 2026-07-24T23:15:17Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-009]
conflicts_with: [repository-wide-quality, github-repository, npm-registry, .project/projects/strap-rebrand/inventory]
parallel: false
priority: high
estimate: XL
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Run full quality browser release and closeout gates

## Description

Run repository-wide verification, migration and CLI gates, two-model agent-contract checks, T3 browser smoke, inventory evidence updates, GitHub repository rename, npm publication, and Delano closeout after T-009.

## Acceptance Criteria

- [x] Root tests, strict TypeScript, lint, production build, Delano validation, CLI checks, scanner, and available migration checks pass.
- [x] Public and available authenticated browser routes pass desktop and mobile smoke with clean relevant console/network results.
- [x] GitHub repository rename and @bvdm/strap publication are verified, or a concrete credential/tool blocker is recorded without claiming completion.
- [x] All inventory tasks have evidence-backed terminal status and the project closes cleanly.

## Traceability
- Story: none
- Acceptance criteria: none

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-24T23:15:17Z: Published and verified rename-first commit c92006069bea3beaece280e6c69e51918ca7e40d on MajesteitBart/Strap main. Root and CLI gates pass; the GitHub contents API shows the canonical Strap clone URL and read_strap example; the redirected remote resolves the same commit. GitHub code search remains temporarily cached on the preceding commit, as shown by its result URLs.

- 2026-07-24T23:12:02Z: Published verified rename-first commit c92006069bea3beaece280e6c69e51918ca7e40d to MajesteitBart/Strap main. GitHub contents API confirms README uses the Strap clone URL and read_strap example; code search is still indexed at the preceding commit and remains under observation.

- 2026-07-24T23:05:06Z: Publish the verified rename-first worktree to the renamed GitHub repository while excluding unrelated contract and local artifacts.

- 2026-07-24T23:05:05Z: Correct false remote-release closeout: local Strap rebrand was never committed or pushed, so GitHub main still served the old clone command and pre-rebrand code.

- 2026-07-24T21:38:31Z: Completed all rename-first inventory tasks. Root tests 179/179, TypeScript, ESLint, 102-route build, both CLI suites/typechecks, Supabase reset, two-model contract review, exhaustive brand audit, desktop/mobile browser smoke, inventory integrity, OpenWiki refresh, and Delano validation pass. GitHub is MajesteitBart/Strap with redirect verified. @bvdm/strap@0.1.1 is published as latest with verified integrity and executable metadata.

- 2026-07-24T21:32:53Z: Quality evidence: root tests 179/179, strict TypeScript, ESLint, 102-route production build, Strap CLI 30/30 plus typecheck, legacy CLI 20/20 plus typecheck, local Supabase reset, two-model contract review, Delano validation, and exhaustive brand audit pass. Browser evidence: ten public/auth routes pass at desktop and 390x844 with zero console warnings/errors or page errors; unauthenticated product routes gate correctly. GitHub is renamed to MajesteitBart/Strap with origin updated and old-remote redirect verified. npm tarball 0.1.1 is verified but registry publication awaits the operator's interactive OTP approval.

- 2026-07-24T20:51:25Z: Starting full repository, protocol, browser, inventory, npm, and GitHub closeout verification.

- 2026-07-24T20:51:20Z: Integration task is complete; release-quality, browser, inventory, publication, and repository gates are ready.
- 2026-07-24T20:00:37Z: Created from .project/templates/task.md by `delano task add`.
