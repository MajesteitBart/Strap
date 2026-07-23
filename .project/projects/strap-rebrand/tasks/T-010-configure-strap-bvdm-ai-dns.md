---
id: T-010
name: Configure strap.bvdm.ai DNS
status: done
workstream: WS-D
created: 2026-07-23T08:21:20Z
updated: 2026-07-23T08:42:42Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: []
conflicts_with: []
parallel: true
priority: high
estimate: S
operating_mode: scoped-change
story_id: 
acceptance_criteria_ids: []
---

# Task: Configure strap.bvdm.ai DNS

## Description

Use the Cloudflare API token stored in Bitwarden Secrets Manager to add strap.bvdm.ai without exposing credentials or overwriting an unrelated record.

## Acceptance Criteria

- [x] The Cloudflare zone for bvdm.ai contains the intended strap.bvdm.ai DNS record.
- [x] The record is verified through the Cloudflare API and public DNS resolution.

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

- 2026-07-23T08:42:42Z: Created unproxied CNAME strap.bvdm.ai -> creed-bvdm.netlify.app with TTL auto using the scoped BWS Cloudflare token. Cloudflare API returned one exact record and public DNS returned the same CNAME.

- 2026-07-23T08:21:21Z: User explicitly approved using the Cloudflare BWS key to add the subdomain.
- 2026-07-23T08:21:20Z: Created from .project/templates/task.md by `delano task add`.
