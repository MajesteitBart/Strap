---
type: research_intake
project: strap-rebrand
slug: creed-remnant-inventory
owner: MajesteitBart
status: completed
created: 2026-07-24T14:28:32Z
updated: 2026-07-24T14:49:03Z
---

# Research Plan: Creed Remnant Inventory

## Goal

Identify every remaining Creed-era name, package surface, content reference, path, asset, and visual-design pattern, then fold each actionable finding into a simple Strap rebrand inventory with one Markdown task file per finding.

## Primary Question

Which remaining Creed-era names, package surfaces, content, routes, assets, documentation, and visual design patterns must be migrated, retained for compatibility, or escalated to complete the Strap rebrand?

## Scope

### In Scope

- Search tracked and relevant untracked repository files for Creed-era naming, domains, package identities, filenames, paths, copy, metadata, and assets.
- Audit the public website and authenticated product for visual-design drift from the Strap worktable design language.
- Classify compatibility-sensitive identifiers separately from safe rebranding work.
- Create an indexed Markdown task inventory using the user-provided frontmatter schema.

### Out of Scope

- Implementing the rebrand tasks discovered by this audit.
- Destructive identifier, schema, route, package, credential, or file migrations.
- External repository, npm, DNS, deployment, or tracker mutations.
- Storing secrets, credentials, or private machine paths.

## Current Phase

Folded forward

## Phases

- [x] Open research intake
- [x] Investigate sources and options
- [x] Summarize findings
- [x] Fold forward into the indexed task inventory

## Decisions Made

| Decision | Rationale |
| --- | --- |
| Inventory compatibility identifiers instead of silently excluding them | The user asked for every remaining Creed surface, and compatibility status is itself a decision that must stay visible. |
| Use one task subfile per distinct resolution unit | This preserves exact file and line evidence while keeping implementation work independently actionable. |
| Treat the tracked-file census as the controlling scope | The prior brand gate excluded 388 tracked files and missed lowercase text, paths, comments, CSS, SQL, tests, generated docs, and semantic design drift. |
| Preserve closed delivery history | Historical specs, decisions, migrations, and the legacy CLI are classified explicitly instead of being cosmetically rewritten. |
| Sequence the follow-up as rename first and redesign later | The user resolved the remaining design direction and asked that the rename be completed before a separate redesign phase. |

## Blockers

| Blocker | Owner | Check-back |
| --- | --- | --- |
| None | MajesteitBart | N/A |
