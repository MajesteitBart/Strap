---
id: T-009
name: Integrate staged path module schema and skill moves
status: done
workstream: WS-E
created: 2026-07-24T20:00:36Z
updated: 2026-07-24T20:51:13Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-001 T-002 T-003 T-004 T-005 T-006 T-007 T-008]
conflicts_with: [components/creed, app/(creed-app), lib/creed-*, .agents/skills/creed-repo, repository-wide-imports]
parallel: false
priority: high
estimate: XL
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Integrate staged path module schema and skill moves

## Description

After T-001 through T-008, perform cross-cutting path and module moves from Creed to Strap, including components and route-group paths, repo-skill identity, import/export compatibility, and remaining inventory integration. Resolve conflicts without reverting worker changes.

## Acceptance Criteria

- [x] Active source and skill paths use Strap where approved and all imports/build references resolve.
- [x] Compatibility re-exports, aliases, or migrations cover deployed callers and stored data.
- [x] The exhaustive inventory and scanner report no unclassified Creed names or Creed-named paths.

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

- 2026-07-24T20:51:13Z: Canonical paths/imports resolve; compatibility shims and migration coverage pass; brand audit reports zero unclassified findings.

- 2026-07-24T20:23:18Z: Begin staged canonical path/module/skill migration after parallel handoff.

- 2026-07-24T20:23:18Z: Dependencies T-001 through T-008 are complete with focused evidence; staged move map is read-only reviewed and conflict-safe.
- 2026-07-24T20:00:36Z: Created from .project/templates/task.md by `delano task add`.
- 2026-07-24T20:50:51Z: Canonicalized `app/(strap-app)`, `components/strap`, ten `lib/strap-*` implementations, `app/api/app/straps`, `.agents/skills/strap-repo`, and the generated `.claude` mirror. Deprecated re-export/API shims preserve installed callers and persisted data.
- 2026-07-24T20:50:51Z: Active narrative comments were reviewed across app, protocol, components, and lib. Remaining Creed names are exact compatibility identifiers or historical external names.
- 2026-07-24T20:50:51Z: `npm run audit:brand` passed with 486 exact classifications and 16 positive Strap assertions; canonical-path search is clean except explicit compatibility tests.
