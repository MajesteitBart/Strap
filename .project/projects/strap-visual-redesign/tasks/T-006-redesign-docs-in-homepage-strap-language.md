---
id: T-006
name: Redesign Docs in Homepage Strap Language
status: done
workstream: WS-A
created: 2026-07-25T00:12:50Z
updated: 2026-07-25T00:32:58Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: [components/marketing/docs-page-view.tsx, components/marketing/strap-home.tsx, components/marketing/strap-site-shell.tsx, app/globals.css]
parallel: false
priority: high
estimate: L
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Redesign Docs in Homepage Strap Language

## Description

Use the approved /home visual language for /docs while preserving the existing documentation content and navigation behavior.

## Acceptance Criteria

- [x] The /docs route uses the same shared Strap navigation, footer, warm paper palette, typography, borders, and resource-card language as /home.
- [x] Documentation navigation and content remain usable on desktop and mobile, including keyboard navigation and reduced-motion behavior.
- [x] TypeScript, lint, production build, and responsive browser checks pass.

## Traceability
- Story: none
- Acceptance criteria: none

## Technical Notes

- `components/marketing/strap-site-shell.tsx` now owns the shared worktable navigation, footer, and authentication-aware CTA contract used by `/home` and `/docs`.
- Docs-specific worktable classes remain scoped under `.strap-docs` so the authenticated product tokens and the still-unredesigned inner marketing routes do not change.
- The docs retain explicitly labelled legacy protocol names only where they document supported compatibility aliases; the exact reviewed allowlist fingerprint was refreshed.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-25T00:32:58Z: Browser: 1440x1000 and 390x844, keyboard, reduced motion, hash scrolling, zero horizontal overflow, no page errors. Gates: tsc, lint, 180 tests, brand audit, and production build passed.

- 2026-07-25T00:12:52Z: User explicitly approved /home as the visual reference and requested /docs be brought into that Strap system.
- 2026-07-25T00:12:50Z: Created from .project/templates/task.md by `delano task add`.
