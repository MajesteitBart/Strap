---
type: research_progress
project: strap-rebrand
slug: creed-remnant-inventory
created: 2026-07-24T14:28:32Z
updated: 2026-07-24T14:49:03Z
---

# Progress: Creed Remnant Inventory

## 2026-07-24T14:28:32Z

- Opened research intake for project `strap-rebrand`.
- Primary question: Which remaining Creed-era names, package surfaces, content, routes, assets, documentation, and visual design patterns must be migrated, retained for compatibility, or escalated to complete the Strap rebrand?
- Recorded that the prior brand gate excluded major repository areas and treated retained identifiers as allowlisted rather than inventoried.
- The prescribed Bash helper could not run because this checkout has no Bash runtime; recreated its documented file structure directly.

## 2026-07-24T14:49:03Z

- Completed eight non-overlapping medium-effort audits and an independent tracked-file census.
- Counted 8,058 case-insensitive Creed occurrences in 413 of 925 tracked files plus 133 Creed-named tracked paths.
- Compared the production homepage and inner routes through T3 Preview. DOM and computed-style evidence confirmed the homepage uses Bricolage/Inter and the warm worktable system while `/docs`, `/pricing`, `/stack`, `/privacy`, and `/login` use Geist, Creed tokens, and the prior rounded/scenery system.
- T3 snapshot capture failed with preview automation errors, so no screenshot artifact was saved; route, DOM, title, typography, color, border, and class evidence remained available through navigation and evaluation.
- Folded findings into `.project/projects/strap-rebrand/inventory/index.md` and 111 task subfiles using the requested frontmatter schema.
- Classified 71 tasks as `todo` and 4 as intentionally retained `done`; all 36 former escalations now preserve the user's reply as `replied_by_user`.
- Verified every task file contains `file`, list-form `line_numbers`, `situation`, `resolution`, and an inventory workflow status; verified all 111 index links resolve with no missing or stale entries.

## Validation Evidence

- `delano validate` passed after opening the research intake with zero errors or warnings.
- Inventory schema check passed for 111 task files.
- `js-yaml` parsed all 111 frontmatter blocks with only the requested fields, list-form line numbers, and the current inventory workflow statuses.
- Inventory index integrity passed with 111 tasks, 111 links, zero missing links, and zero stale links.
- Final `delano validate` passed with zero errors or warnings after inventory fold-forward and context update.
- The existing narrow brand gate still passes at 448 files, 23 classified occurrences, and 22 allowlist entries; this is recorded as baseline evidence, not exhaustive coverage.

## Handoff Summary

- Research is complete and folded forward into the indexed inventory.
- Implementation has not begun.
- The highest-priority safe fixes include the broken secret-bearing read URL, visible panel/export copy, new setup aliases, `strap.md` schema defaults, Vault descriptions, CLI identity normalization, docs truth, and the inner public-site redesign.
- No `escalate_to_user` labels remain. The task files preserve the user's replies, including the shared rename-first and redesign-later direction, while retaining task-specific compatibility and external-release safeguards.
