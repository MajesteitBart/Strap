---
id: T-003
name: Seed repository context and delivery contracts
status: done
workstream: WS-B
created: 2026-07-22T05:19:57Z
updated: 2026-07-22T05:24:13Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-001]
conflicts_with: [.project/**, BOOTSTRAP.md]
parallel: true
priority: high
estimate: M
operating_mode: feature
story_id: US-001
acceptance_criteria_ids: [AC-003]
---

# Task: Seed repository context and delivery contracts

## Description

Replace generic starter context with evidence-backed Creed context and document the repeatable bootstrap.

## Acceptance Criteria

- [x] No starter placeholders remain in .project/context.
- [x] BOOTSTRAP.md records the repository-specific setup and boundaries.

## Traceability
- Story: US-001
- Acceptance criteria: AC-003

## Technical Notes

- Used the installed `manage-context` runbook and audit checklist.
- Grounded the context pack in public repository docs, the OpenWiki quickstart, package scripts, current source shape, and the private brief's requirements without copying its path or private contents.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-22T05:24:13Z: manage-context produced repository-specific context and BOOTSTRAP.md with provenance and no intentionally retained starter text.

- 2026-07-22T05:24:12Z: Record completed repository context and contract seeding.

- 2026-07-22T05:24:12Z: Runtime dependency is complete and context acceptance is met.
- 2026-07-22T05:19:57Z: Created from .project/templates/task.md by `delano task add`.
- 2026-07-22T05:20:23Z: All required context files and bootstrap project contracts were replaced with repository-specific content; `source-materials.md` records provenance.
