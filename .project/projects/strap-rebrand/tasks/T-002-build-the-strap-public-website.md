---
id: T-002
name: Build the Strap public website
status: done
workstream: WS-A
created: 2026-07-23T02:05:37Z
updated: 2026-07-23T08:42:42Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-001]
conflicts_with: []
parallel: false
priority: high
estimate: XL
operating_mode: multi-stream
story_id: US-001
acceptance_criteria_ids: [AC-001 AC-008]
---

# Task: Build the Strap public website

## Description

Replace the scenic landing experience with a responsive Strap worktable site derived from the supplied design and approved positioning.

## Acceptance Criteria

- [x] Home page uses the Strap logo, worktable system, resource color code, and exact approved positioning.
- [x] Desktop, tablet, mobile, reduced-motion, keyboard, and contrast behavior are coherent.
- [x] Marketing rendering remains isolated from authenticated user state.

## Traceability
- Story: US-001
- Acceptance criteria: AC-001 AC-008

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-23T08:42:42Z: Production https://strap.bvdm.ai/home renders the Strap logo, worktable system, exact positioning, and resource colors at 490px mobile, 820px tablet, and 1440px desktop widths; keyboard focus is visibly outlined; automated isolation and reduced-motion checks already pass.

- 2026-07-23T03:21:53Z: Computer Use native Windows helper pipe is unavailable; required visual and interaction acceptance cannot be performed without violating the computer-use skill's no-fallback rule.

- 2026-07-23T03:21:38Z: Source implementation, strict TypeScript, lint, tests, brand audit, and production build pass. Required visual desktop/mobile/reduced-motion/keyboard/console/network evidence remains unavailable because Computer Use could not connect to its native Windows helper.

- 2026-07-23T02:58:35Z: Begin computer-use and responsive acceptance for the implemented Strap public website.

- 2026-07-23T02:58:03Z: Implementation is complete, but responsive, keyboard, reduced-motion, contrast, and browser isolation acceptance remains pending computer-use quality evidence.

- 2026-07-23T02:20:39Z: Implemented the responsive Strap worktable home page from supplied assets, added local Bricolage/Inter/JetBrains font loading, and passed strict TypeScript, focused ESLint, and diff checks. Browser acceptance remains part of T-009.

- 2026-07-23T02:12:13Z: Implement responsive Strap home page and typography.

- 2026-07-23T02:12:13Z: T-001 foundation passed focused verification; begin supplied worktable website.
- 2026-07-23T02:05:37Z: Created from .project/templates/task.md by `delano task add`.
