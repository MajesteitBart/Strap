---
id: T-006
name: Rebrand agent prompts MCP and API discovery
status: done
workstream: WS-B
created: 2026-07-23T02:05:38Z
updated: 2026-07-23T02:45:33Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-001]
conflicts_with: []
parallel: false
priority: high
estimate: L
operating_mode: multi-stream
story_id: US-004
acceptance_criteria_ids: [AC-005 AC-006]
---

# Task: Rebrand agent prompts MCP and API discovery

## Description

Update agent-visible descriptions, prompts, discovery, connection guidance, and additive Strap aliases where required without breaking existing clients.

## Acceptance Criteria

- [x] New agent-facing copy and setup use Strap and strap.bvdm.ai.
- [x] Existing credentials endpoints and cached tool clients continue to work.
- [x] Agent contract read and proposal behavior is checked across Codex and Fable.

## Traceability
- Story: US-004
- Acceptance criteria: AC-005 AC-006

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-23T02:45:33Z: MCP serverInfo, guidance, docs defaults, connection setup, and CLI header are Strap-first; legacy origin, creed_* tools, creed://profile, API routes, and legacy CLI header remain compatible. TypeScript, focused ESLint, 17 focused tests, and grounded Fable review all passed.
- 2026-07-23T02:05:38Z: Created from .project/templates/task.md by `delano task add`.
