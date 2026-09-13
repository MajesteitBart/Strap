---
id: T-004
name: Verify and release shared skills
status: done
workstream: WS-A
created: 2026-09-13T13:38:19Z
updated: 2026-09-13T16:27:12Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-002, T-003]
conflicts_with: []
parallel: false
priority: medium
estimate: L
operating_mode: feature
story_id:
acceptance_criteria_ids: []
---

# Task: Verify and release shared skills

## Description
Release only after final tests, local migration verification, browser acceptance, completed Codex review of the final head, passing CI, hosted migration, production checks, and verified npm publication.

## Acceptance Criteria

- [x] App and both CLI suites, types, lint, build, database and browser checks pass.
- [x] Reviewed feature is merged, migration is applied, production and packaged CLI flows are verified.

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

- 2026-09-13T16:27:12Z: PR 13 merged as ae692af after completed clean review and green CI; exact production deployment and hosted migrations verified. npm 0.2.0 published with matching integrity and fresh registry-installed two-device sync passed. Evidence: updates/2026-09-13-release-complete.md

- 2026-09-13T16:23:07Z: App merged and production verified. CLI 0.2.0 is tested and publish-authorized, but npm requires a separate browser MFA approval; the interactive challenge expired without completion.

- 2026-09-13T15:18:44Z: Browser acceptance complete; migration applied; final review, CI, package publication and production verification remain.
- 2026-09-13T13:38:19Z: Created from .project/templates/task.md by `delano task add`.
