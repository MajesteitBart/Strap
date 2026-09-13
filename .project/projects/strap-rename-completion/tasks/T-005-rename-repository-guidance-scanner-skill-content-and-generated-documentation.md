---
id: T-005
name: Rename repository guidance scanner skill content and generated documentation
status: done
workstream: WS-C
created: 2026-07-24T20:00:34Z
updated: 2026-07-24T20:22:57Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: [AGENTS.md, README.md, BOOTSTRAP.md, LICENSE, .gitignore, .project/context, scripts/check-strap-rebrand, .agents/skills/creed-repo, openwiki]
parallel: true
priority: high
estimate: XL
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Rename repository guidance scanner skill content and generated documentation

## Description

Implement inventory R-067 through R-080 except GitHub repository mutation and broad skill-directory move, which are staged in T-009/T-010. Own AGENTS.md, README.md, BOOTSTRAP.md, LICENSE, .gitignore, .project/context content, rebrand scanner/allowlist, repo-skill content, and OpenWiki source regeneration.

## Acceptance Criteria

- [x] Active repository guidance and generated documentation are Strap-first and internally consistent.
- [x] The scanner covers all tracked files and Creed-named paths with explicit compatibility or history classifications.
- [x] OpenWiki is regenerated from renamed source truth and scanner/Delano checks pass.

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

- 2026-07-24T20:22:57Z: Updated repository guidance, context, environment docs, corrective prior evidence, active comments, exhaustive scanner/allowlist, Strap skill content, and regenerated all OpenWiki pages. Scanner passed with 595 exact compatibility/history classifications and positive Strap assertions; focused ESLint and diff check passed. Physical skill path move and GitHub rename remain T-009/T-010.

- 2026-07-24T20:01:51Z: Assigned to a medium-effort worker under the documented file boundary.

- 2026-07-24T20:01:50Z: Readiness reviewed: explicit ownership, binary acceptance criteria, no unmet dependencies, and user-approved rename-first execution.
- 2026-07-24T20:00:34Z: Created from .project/templates/task.md by `delano task add`.
