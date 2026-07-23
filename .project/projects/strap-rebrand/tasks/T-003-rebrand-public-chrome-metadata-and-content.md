---
id: T-003
name: Rebrand public chrome metadata and content
status: done
workstream: WS-A
created: 2026-07-23T02:05:37Z
updated: 2026-07-23T02:25:45Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-001]
conflicts_with: []
parallel: true
priority: high
estimate: XL
operating_mode: multi-stream
story_id: US-001
acceptance_criteria_ids: [AC-002 AC-007]
---

# Task: Rebrand public chrome metadata and content

## Description

Update public navigation, metadata, JSON-LD, robots, llms, legal, docs, pricing, stack, learn content, social identity, and domain references.

## Acceptance Criteria

- [x] Public routes and metadata use Strap and strap.bvdm.ai with no unintended Creed customer copy.
- [x] Canonical, Open Graph, structured-data, robots, and llms surfaces agree.
- [x] Legal/contact configuration remains environment-driven.

## Traceability
- Story: US-001
- Acceptance criteria: AC-002 AC-007

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-23T02:25:45Z: Rebranded 58 public source files plus root metadata and dynamic social card; added Strap learn slugs with permanent legacy redirects; TypeScript, focused ESLint (0 errors), and all 142 root tests pass.

- 2026-07-23T02:20:39Z: Rebrand public chrome, SEO, docs, legal, learn, and domain surfaces.

- 2026-07-23T02:20:39Z: Brand foundation and home implementation complete; begin public content/metadata migration.
- 2026-07-23T02:05:37Z: Created from .project/templates/task.md by `delano task add`.
