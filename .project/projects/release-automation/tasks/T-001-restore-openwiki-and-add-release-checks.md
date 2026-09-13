---
id: T-001
name: Restore OpenWiki and add release checks
status: blocked
workstream: WS-A
created: 2026-09-13T09:35:41Z
updated: 2026-09-13T11:09:49Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: []
conflicts_with: []
parallel: true
priority: medium
estimate: M
operating_mode: patch
story_id: 
acceptance_criteria_ids: []
blocked_owner: MajesteitBart
blocked_check_back: 2026-09-14
---

# Task: Restore OpenWiki and add release checks

## Description

Pin OpenWiki and actions, select OpenRouter explicitly, configure its project key securely, protect authored instructions and workflow code, and add app and CLI checks.

## Acceptance Criteria

- [ ] OpenWiki uses a pinned version and explicit configured provider with no credential output.
- [ ] Generated pull requests contain only wiki files and never executable workflow edits.
- [x] Application and both CLI checks run for pull requests and main (shipped independently in PR 10, main run 34754241737).
- [ ] A real scheduled-workflow execution and final-head PR checks pass.

## Traceability
- Story: none
- Acceptance criteria: none

## Technical Notes

## Definition of Done
- [ ] Implementation complete
- [ ] Tests pass
- [ ] Review complete
- [ ] Docs updated

## Evidence Log

- 2026-09-13T11:09:49Z: Live OpenWiki verification is blocked by the OpenRouter free-model daily quota; earlier native-worker completion failures remain unverified. Independent CI is extracted to fix/release-verification.

- 2026-09-13T09:35:41Z: Repairing the confirmed scheduled workflow failure.

- 2026-09-13T09:35:41Z: User authorized finishing project maintenance and merging verified feature branches.
- 2026-09-13T09:35:41Z: Created from .project/templates/task.md by `delano task add`.
