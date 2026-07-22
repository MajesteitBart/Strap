---
id: T-002
name: Create Delano-aware agent entrypoints
status: done
workstream: WS-A
created: 2026-07-22T05:19:57Z
updated: 2026-07-22T05:24:12Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-001]
conflicts_with: [AGENTS.md, CLAUDE.md, .agents/skills/**]
parallel: false
priority: high
estimate: S
operating_mode: feature
story_id: US-001
acceptance_criteria_ids: [AC-002]
---

# Task: Create Delano-aware agent entrypoints

## Description

Adapt AGENTS.md and create thin compatibility entrypoints while preserving Creed invariants.

## Acceptance Criteria

- [x] AGENTS.md identifies the Delano source of truth and first-turn workflow.
- [x] CLAUDE.md contains only @AGENTS.md.
- [x] Required shadcn and next-forge skills are installed.

## Traceability
- Story: US-001
- Acceptance criteria: AC-002

## Technical Notes

- Preserved Creed's existing invariants and added a retrieval-oriented Delano section based on the approved onboarding analysis.
- Installed `vercel/next-forge@next-forge` project-locally; `shadcn` was included by Delano.
- Skipped `next-forge init` because its documented behavior is to initialize a new project.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-22T05:24:12Z: AGENTS.md includes Delano retrieval workflow, CLAUDE.md is a one-line import, and creed-repo, shadcn, and next-forge skills are present.

- 2026-07-22T05:24:11Z: Record completed entrypoint and frontend skill setup.

- 2026-07-22T05:24:11Z: Runtime dependency is complete and entrypoint acceptance is met.
- 2026-07-22T05:19:57Z: Created from .project/templates/task.md by `delano task add`.
- 2026-07-22T05:20:23Z: Entry points updated and `creed-repo`, `shadcn`, and `next-forge` skill directories confirmed under `.agents/skills/`.
