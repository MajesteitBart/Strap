---
id: T-004
name: Build shared Strap UI variants assets and motion guidance
status: done
workstream: WS-D
created: 2026-07-24T21:18:47Z
updated: 2026-09-13T10:29:12Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: []
conflicts_with: [components/ui, app/globals.css, public/assets/brand]
parallel: false
priority: high
estimate: L
operating_mode: multi-stream
story_id: 
acceptance_criteria_ids: []
---

# Task: Build shared Strap UI variants assets and motion guidance

## Description

Create the shared component variants, typography, color, radius, asset, email, and motion primitives needed by the public and product redesign streams.

## Acceptance Criteria

- [ ] Reusable primitives encode the approved Strap system and pass accessibility, responsive, and motion checks.

## Traceability
- Story: none
- Acceptance criteria: none

## Technical Notes

## Definition of Done
- [ ] Implementation complete
- [ ] Tests pass
- [ ] Review complete
- [ ] Docs updated

## Evidence Log

- 2026-09-13T10:29:12Z: Commits bcc1df8, a98206c, and the review fix commit: warm paper tokens with a warm dark twin, resource and status tokens, frame token, Inter, Bricolage Grotesque, JetBrains Mono, 2 to 6px radii, app/strap-public.css primitives, flat framed shadcn primitives, contrast-checked soft text (5.38:1 paper, 4.92:1 surface-2), reduced-motion guards. tsc, lint, 184 tests, production build pass.

- 2026-09-13T09:29:17Z: User approved the /home and /docs worktable direction for all remaining surfaces on 2026-09-13; shared tokens and primitives lead.
- 2026-07-24T21:18:47Z: Created from .project/templates/task.md by `delano task add`.
