# Project Brief

## Problem
- Product problem: people using multiple AI tools repeatedly explain the same durable personal context, while ad hoc memory and notes become stale, noisy, or unsafe.
- Delivery result: the rename-first follow-up removed the first rebrand's active copy, documentation, guidance, default, path, and package-attribution drift while preserving intentional protocol and data compatibility.

## Target Outcome
- Strap is the canonical product at `https://strap.bvdm.ai`, positioned as "Bootstrap your agents with context, skills, and keys." (public messaging uses "keys"; the technical model keeps "secrets").
- New files and GitHub integrations default to `strap.md`; old stored paths remain safe and non-divergent.
- New terminal workflows use the separate `@bvdm/strap` package while `creed-cli` remains unchanged.
- Delano remains the evidence-backed local delivery contract.
- Future work can start from explicit project and task contracts without weakening the existing product, security, or verification rules.

## Scope Boundaries
- In scope: product brand and copy, public website, metadata, profile filename defaults, agent discovery, connection setup, new CLI package, repository docs/configuration, compatibility tests, scanner coverage, generated guidance, and release evidence.
- Canonical source paths use `app/(strap-app)/`, `components/strap/`, `lib/strap-*`, and `.agents/skills/strap-repo/`; narrow re-export shims preserve approved source compatibility. `@bvdm/strap@0.1.1` is published and the repository is `MajesteitBart/Strap`. Destructive removal of legacy origins, API aliases, tools, stored identifiers, schema history, or the legacy CLI still requires an explicit compatibility decision.
