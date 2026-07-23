---
id: T-005
name: Migrate canonical file and GitHub sync to strap.md
status: done
workstream: WS-B
created: 2026-07-23T02:05:38Z
updated: 2026-07-23T02:35:16Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-001]
conflicts_with: []
parallel: true
priority: high
estimate: L
operating_mode: multi-stream
story_id: US-003
acceptance_criteria_ids: [AC-003 AC-004 AC-005]
---

# Task: Migrate canonical file and GitHub sync to strap.md

## Description

Make strap.md the export and new GitHub sync default with legacy creed.md pull compatibility and focused tests.

## Acceptance Criteria

- [x] Every new export and GitHub push defaults to strap.md.
- [x] Pull discovers strap.md first and falls back to creed.md when needed.
- [x] Round-trip content and Personal/Company authorization behavior remain unchanged.
- [x] Existing integrations honor their stored explicit path, including continued creed.md writes until explicit migration.
- [x] A repository containing only creed.md never receives an automatic second divergent strap.md file.

## Traceability
- Story: US-003
- Acceptance criteria: AC-003 AC-004 AC-005

## Technical Notes

- Own filename/default/fallback logic and focused tests. Coordinate edits to shared export UI with T-004; do not run T-004 and T-005 concurrently in the same files.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-23T02:35:16Z: strap.md is the default and export filename; existing stored paths remain authoritative; GitHub reads fall back to creed.md and pushes refuse divergence; npx tsc --noEmit passed, targeted ESLint passed, npm test passed 146/146.

- 2026-07-23T02:27:32Z: Implement strap.md defaults with explicit stored-path and creed.md compatibility behavior.

- 2026-07-23T02:27:32Z: Product copy migration complete; begin canonical file and GitHub compatibility work.
- 2026-07-23T02:05:38Z: Created from .project/templates/task.md by `delano task add`.
