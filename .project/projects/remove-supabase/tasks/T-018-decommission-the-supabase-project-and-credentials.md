---
id: T-018
name: Decommission the Supabase project and credentials
status: deferred
workstream: WS-E
created: 2026-09-13T17:49:34Z
updated: 2026-09-13T21:47:31Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-017]
conflicts_with: []
parallel: false
priority: medium
estimate: S
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Decommission the Supabase project and credentials

## Description
After 30 days without rollback, delete the Supabase project, revoke its keys, remove every `SUPABASE_*` variable from Netlify and `.env.local`, and record the closure.

## Acceptance Criteria
- [ ] No Supabase credential remains in any environment.
- [ ] The project deletion is recorded with the date in the evidence log.

## Traceability
- Story: US-005
- Acceptance criteria: none

## Technical Notes
Deletion is irreversible and needs Bart's explicit approval.

## Definition of Done
- [ ] Implementation complete
- [ ] Tests pass
- [ ] Review complete
- [ ] Docs updated

## Evidence Log

- 2026-09-13T21:47:31Z: Production decommission follows approved cutover and the 30-day rollback period.
- 2026-09-13: Planned from the Supabase surface inventory.
