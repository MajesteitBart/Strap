# Project Brief

## Problem
- Product problem: people using multiple AI tools repeatedly explain the same durable personal context, while ad hoc memory and notes become stale, noisy, or unsafe.
- Delivery problem: the public Creed identity, canonical `creed.md` filename, original site, and legacy CLI no longer match the Strap product direction, while existing protocol clients and stored files must continue to work.

## Target Outcome
- Strap is the canonical product at `https://strap.bvdm.ai`, positioned as "Bootstrap your agents with context, skills, and keys." (public messaging uses "keys"; the technical model keeps "secrets").
- New files and GitHub integrations default to `strap.md`; old stored paths remain safe and non-divergent.
- New terminal workflows use the separate `@bvdm/strap` package while `creed-cli` remains unchanged.
- Delano remains the evidence-backed local delivery contract.
- Future work can start from explicit project and task contracts without weakening the existing product, security, or verification rules.

## Scope Boundaries
- In scope: product brand and copy, public website, metadata, profile filename defaults, agent discovery, connection setup, new CLI package, repository docs/configuration, compatibility tests, and release evidence.
- Out of scope without explicit approval: DNS and production deployment changes, npm publication, GitHub repository rename, destructive removal of legacy origins/routes/tools/files, database schema renames, and external tracker writes.
