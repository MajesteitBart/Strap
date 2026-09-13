---
id: T-001
name: Update and verify vulnerable dependencies
status: done
workstream: WS-A
created: 2026-09-13T13:06:55Z
updated: 2026-09-13T16:38:13Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: []
parallel: true
priority: high
estimate: M
operating_mode: patch
story_id:
acceptance_criteria_ids: []
---

# Task: Update and verify vulnerable dependencies

## Description

Update the pinned Next runtime and matching tooling, refresh compatible vulnerable dependencies, and verify application and deployment behavior.

## Acceptance Criteria

- [x] The installed dependency audit has no fixable critical or high findings after compatible updates.
- [x] Tests, strict types, lint, production build, brand audit and CI pass on the final reviewed head.
- [x] Netlify deploys the reviewed runtime and public, auth, health and image smoke checks pass.

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

- 2026-09-13T16:38:13Z: PR 12 completed Codex review on 1a8579ed (summary 5653532791), merged as 87d749f, and passed main CI 34759930948. Netlify 6aa6a4f1a30b8000088623eb and production public/auth/health/image smoke passed; see updates/2026-09-13-production-verified.md for deployment evidence.

- 2026-09-13: Next and matching tooling are pinned to 16.3.5. Compatible dependency repairs yield zero vulnerabilities and no npm dependency-tree problems. The 204 application tests pass, including editor schema and prototype-handling regressions. The old installed Tiptap version reproduces the inherited-handler defect, while the patched regression passes.
- 2026-09-13: Strict types and production build pass. ESLint has no errors; its new Next rule reports six warnings on unchanged full-page navigation sites. Final-head CI, review and production deployment remain pending.

- 2026-09-13T13:06:55Z: New critical vendor advisories affect the deployed runtime
- 2026-09-13T13:06:55Z: Created from .project/templates/task.md by `delano task add`.
