---
id: T-017
name: Execute the production cutover
status: deferred
workstream: WS-E
created: 2026-09-13T17:49:33Z
updated: 2026-09-13T21:47:31Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-003, T-016, T-019, T-020, T-021]
conflicts_with: []
parallel: false
priority: high
estimate: M
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Execute the production cutover

## Description
Announce the window, stop application writes, run the final export and import, switch the Netlify environment variables, deploy the release, verify the touchpoints list from `spec.md`, and pause the Supabase project.

## Acceptance Criteria
- [ ] The post-cutover checklist is complete with evidence under `updates/`.
- [ ] Rollback was tested on the rehearsal branch before the window opened.
- [ ] Both users, all OAuth tokens, and the Vault item are verified on production.

## Traceability
- Story: US-001, US-002, US-003, US-004
- Acceptance criteria: AC-001, AC-002, AC-004

## Technical Notes
This task needs Bart's explicit approval for the window, the environment flip, and the deployment.

## Definition of Done
- [ ] Implementation complete
- [ ] Tests pass
- [ ] Review complete
- [ ] Docs updated

## Evidence Log

- 2026-09-13T21:47:31Z: Owner requested local Postgres first; host and production maintenance window are not selected.
- 2026-09-13: Planned from the Supabase surface inventory.
