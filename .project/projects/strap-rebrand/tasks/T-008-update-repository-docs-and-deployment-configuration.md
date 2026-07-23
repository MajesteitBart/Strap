---
id: T-008
name: Update repository docs and deployment configuration
status: done
workstream: WS-C
created: 2026-07-23T02:05:38Z
updated: 2026-07-23T02:58:09Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-002 T-003 T-004 T-005 T-006 T-007]
conflicts_with: []
parallel: false
priority: medium
estimate: L
operating_mode: multi-stream
story_id: US-005
acceptance_criteria_ids: [AC-007]
---

# Task: Update repository docs and deployment configuration

## Description

Update README, environment examples, security/contribution/operator docs, and context truth for the Strap name and domain.

## Acceptance Criteria

- [x] Repository entrypoints and safe configuration examples use Strap and strap.bvdm.ai.
- [x] Internal compatibility exceptions and release steps are documented.
- [x] No secrets, machine paths, or unapproved external mutations are introduced.

## Traceability
- Story: US-005
- Acceptance criteria: AC-007

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-23T02:58:09Z: README, CONTRIBUTING, SECURITY, AGENTS, BOOTSTRAP, .env.example, root package metadata/lockfile, and .project/context now use Strap and strap.bvdm.ai while documenting stable identifiers and operator-gated external actions. Delano text safety found no absolute path leakage; context audit scored 4/4.

- 2026-07-23T02:52:16Z: CLI package gate passed; updating repository documentation, context, and deployment configuration for Strap.
- 2026-07-23T02:05:38Z: Created from .project/templates/task.md by `delano task add`.
