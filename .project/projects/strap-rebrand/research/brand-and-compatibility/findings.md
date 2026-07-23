---
type: research_findings
project: strap-rebrand
slug: brand-and-compatibility
created: 2026-07-23T02:02:32Z
updated: 2026-07-23T02:15:00Z
---

# Findings: Strap brand and compatibility intake

## Source References

- Supplied `strap-merged-rxiedj4ekbd4zdsb6iremz55ch.html` and `strap-logo-package-f93tq799tiyqjbmuoxa9zk4rje.zip` in the operator-provided Strap handoff.
- `README.md`, `BOOTSTRAP.md`, `AGENTS.md`, `.project/context/*`, and OpenWiki/creed-repo references.
- Repository package manifest, root/home layouts, landing hero, marketing chrome, brand/SEO modules, GitHub routes, export UI, MCP route, and CLI package.
- `rg` customer-brand inventory across application, component, library, package, test, and documentation surfaces.
- Existing uncommitted `WS-D-strap-cli-package.md` and related plan addition in the headless-access project.

## Observations

- The supplied system is intentionally flat, bordered, warm, and proof-first. It uses Bricolage Grotesque, Inter, JetBrains Mono, and stable colors for context, skills, keys, environments, and agents.
- The repository has roughly 300 files containing Creed brand text, but many are internal contracts that must remain stable.
- The current home page is a materially different scenic design; a focused Strap home component is safer than mechanically transforming the existing large composition.
- GitHub sync currently hardcodes `creed.md` across default config, push, pull errors, and UI exports; a dual-read strategy is required.
- The user-authored worktree already chooses a separate `@bvdm/strap` package and `strap` executable.

## Options Considered

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Global rename of all identifiers | Superficially complete | Breaks schema, routes, storage, events, tests, credentials, and clients | Rejected |
| Visible-only text swap | Smallest diff | Misses file, GitHub, CLI, agent, metadata, and release contracts | Rejected |
| Full customer rebrand with additive compatibility | Complete user experience, reversible, safe for existing users | Requires explicit allowlist and broader testing | Selected |

## Fold-Forward Candidates

| Finding | Target Artifact | Proposed Change |
| --- | --- | --- |
| Supplied worktable system is canonical | `spec.md`, WS-A | Implement logo, palette, typography, proof cards, responsive/reduced-motion behavior. |
| Internal Creed identifiers are load-bearing | `decisions.md`, WS-B | Preserve them and add aliases/fallbacks only at visible boundaries. |
| File migration needs dual-read | `spec.md`, WS-B | Write `strap.md`, read `strap.md` then `creed.md`. |
| CLI already has a Strap contract | `plan.md`, WS-C | Implement `@bvdm/strap` separately and preserve prior CLI. |

## Open Questions

- External deployment, DNS, and npm publication remain operator-gated after local readiness.
