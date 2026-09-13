---
type: research_findings
project: strap-rebrand
slug: creed-remnant-inventory
created: 2026-07-24T14:28:32Z
updated: 2026-07-24T14:49:03Z
---

# Findings: Creed Remnant Inventory

## Source References

- Eight medium-effort, read-only audit agents covering current docs/delivery, CLI packages, public site, authenticated UI, agent protocols, persistence/tests, visual assets, and an independent global census.
- `git ls-files`, repository-wide case-insensitive `rg` census, tracked path-name census, and the existing `node scripts/check-strap-rebrand.mts` gate.
- Current application, component, library, package, test, migration, OpenWiki, repo-skill, context, and Delano source.
- T3 Preview inspection of production `/home`, `/docs`, `/pricing`, `/stack`, `/privacy`, and `/login` at a 1280 by 800 viewport, including computed typography, color, border, class, title, and content evidence.
- Existing rebrand spec, plan, decisions, task evidence, allowlist, and closeout.

## Observations

- The tracked repository contains 925 files. A case-insensitive census found 8,058 `creed` occurrences across 413 files and 133 tracked paths whose names contain `creed`.
- The prior gate passes with 448 scanned files, 23 classified occurrences, and 22 allowlist entries, but it excludes 388 tracked files and does not cover lowercase or plural Creed terms, filenames, paths, comments, identifiers, CSS, SQL, MTS, tests, generated docs, or semantic visual drift.
- The public homepage is the only route using the approved warm, flat, hard-bordered worktable system. Inner public pages render Geist typography, Creed CSS tokens, old scenery, rounded cards, soft shadows, and generic blue actions.
- The docs are not thin by code volume, but they remain strategically Creed-era. They omit headless keys, device OAuth, explicit grants, Vault, and most of the broader resource model advertised on the homepage.
- The homepage presents skills, environments, manifests, context packs, and `strap equip` as shipped proof even though those workflows do not exist in the product or CLI.
- Visible lowercase leaks remain in the command panel, exports, setup aliases, model prose, Learn articles, Company copy, and attribution displays. The prior case-sensitive audit misses them.
- The new Strap CLI is branded correctly, but identity normalization recognizes only Creed CLI aliases, so Strap CLI sessions can render as generic clients.
- Two live database defaults still create `creed.md`; a forward migration is required. A Vault function also creates future descriptions reading `Managed by Creed`.
- Generated OpenWiki and the active repo-local skill remain Creed-first and materially stale, including obsolete Stripe/billing guidance and legacy CLI/file defaults.
- `packages/creed-cli`, applied migrations, schema/RLS names, installed protocol identifiers, stored state keys, and closed delivery artifacts are compatibility or historical truth. They must remain visible in the inventory without being mass-renamed.
- One non-brand defect was exposed by the audit: `lib/creed-backend.ts:715-716` generates a rejected secret-bearing query-token URL.

## Options Considered

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Reuse the existing allowlist as the inventory | Fast | Omits whole repository areas and visual drift | Rejected |
| Global textual replacement | Superficially comprehensive | Breaks compatibility and ignores design intent | Rejected |
| Evidence-led inventory with per-finding resolution | Exhaustive, reviewable, implementation-ready | Produces more task files | Selected |

## Fold-Forward Candidates

| Finding | Target Artifact | Proposed Change |
| --- | --- | --- |
| 111 distinct resolution units | `inventory/index.md` and `inventory/tasks/*.md` | Created 71 `todo` and 4 explicitly retained `done` task files; all 36 former escalations now preserve the user's reply as `replied_by_user` |
| Prior audit is incomplete | `inventory/tasks/R-076-*` and `R-077-*` | Rebuild the scanner and allowlist from tracked-file, path, semantic, compatibility, and positive Strap assertions |
| OpenWiki and repo skill are active stale guidance | `inventory/tasks/R-078-*` through `R-080-*` | Refresh sources, regenerate outputs, and decide the installed skill rename/alias policy |
| New work conflicts with a closed project lifecycle | `inventory/tasks/R-073-*` and `R-074-*` | Map the rename-first work into an open Delano contract before execution and retain corrective evidence |

## Recorded User Direction

- Rename first and defer redesign to a later delivery phase.
- Rename public protocol identities to Strap, retaining legacy Creed compatibility where necessary.
- Keep unavailable homepage resources on the roadmap until they ship.
- Preserve task-specific compatibility, migration, lifecycle, and external-release safeguards during implementation.
