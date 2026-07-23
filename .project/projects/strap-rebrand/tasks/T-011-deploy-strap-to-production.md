---
id: T-011
name: Deploy Strap to production
status: done
workstream: WS-D
created: 2026-07-23T08:26:37Z
updated: 2026-07-23T10:34:58Z
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

# Task: Deploy Strap to production

## Description

Deploy the verified local Strap rebrand to the existing Netlify site, validate a draft deployment, then promote it so strap.bvdm.ai serves Strap.

## Acceptance Criteria

- [x] A Netlify draft deployment serves the Strap title and bootstrap headline over HTTPS.
- [x] The production deployment succeeds and strap.bvdm.ai serves the Strap experience.

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

- 2026-07-23T10:34:58Z: Git-backed Netlify production deploy 6a61edde4d776c00087bd686 published commit 1499389 after the clean-build root cause was fixed: the web app tsconfig now excludes the independently installed packages/strap CLI, matching the existing packages/creed-cli boundary. The deploy API progressed building to uploading to ready.

- 2026-07-23T10:18:25Z: Netlify draft 6a61e8e80d2b15c14b30fba2 and production deploy 6a61ea093f05b6cf56da9901 are ready. Production HTTPS, health, OAuth issuer, MCP discovery, revised keys copy, and canonical URL all pass after upgrading Next.js to 16.2.11 and using the Webpack production build for Netlify middleware packaging.

- 2026-07-23T08:42:42Z: Netlify deploy 6a61d28ebceabc361ab37a49 is ready and published. Production HTTPS returns 200, title is Strap - Bootstrap your agents with context, skills, and secrets., canonical is https://strap.bvdm.ai/home, and T3 browser smoke passes.

- 2026-07-23T08:26:37Z: Browser verification showed the new hostname still serves the previous Creed production build.
- 2026-07-23T08:26:37Z: Created from .project/templates/task.md by `delano task add`.
