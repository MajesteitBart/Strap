---
name: Bootstrap Delano for Creed
status: active
lead: MajesteitBart
created: 2026-07-22T05:19:56Z
updated: 2026-07-22T05:24:10Z
linear_project_id:
risk_level: low
spec_status_at_plan_time: planned
operating_mode: feature
---

# Delivery Plan: Bootstrap Delano for Creed

## What Changed After Probe

No probe was required. Read-only inspection confirmed a clean existing repository, private intended origin, established Next.js frontend, and conflict-safe Delano installer. The plan therefore uses a repository retrofit and explicitly skips the new-project next-forge initializer.

## Technical Context

Creed is a Next.js 16 and React 19 application with strict TypeScript, Supabase, OpenRouter, Stripe, GitHub sync, OAuth/MCP agent APIs, and a separate CLI package. Existing `README.md`, `AGENTS.md`, OpenWiki, source, migrations, and tests remain authoritative; Delano adds delivery contracts without entering the application runtime.

## Architecture Decisions

- Keep `.agents/` canonical for Delano runtime assets and `.project/` canonical for delivery state.
- Preserve the existing `creed-repo` skill and install supplemental frontend skills beside it.
- Keep `CLAUDE.md` as an import and do not create a second authored instruction set.
- Represent only the requested bootstrap as a Delano project; create product projects later from explicit outcomes.
- Skip next-forge application initialization because the CLI creates a new starter rather than retrofitting Creed.

## Policy and Contract Checks
- [x] `.project` remains the execution source of truth
- [x] Probe decision is explicit
- [x] Evidence gates are defined before handoff
- [x] External sync writes require dry-run or operator approval

## Generated Artifact Map
- `spec.md`: Created from `.project/templates` by `delano project create`.
- `plan.md`: Created from `.project/templates` by `delano project create`.
- `workstreams/`: Created from `.project/templates` by `delano project create`.
- `tasks/`: Created from `.project/templates` by `delano project create`.

## Complexity Exceptions
- `AGENTS.md` remains longer than a generic Delano entrypoint because Creed's security, data, motion, Supabase, and agent-contract invariants are repository-critical. New Delano material is retrieval-oriented and points to deeper contracts.

## Probe-Driven Architecture Changes

- None. Inspection reinforced the retrofit approach and the decision not to change application architecture.

## Workstream Design

- `WS-A` owns Delano runtime, repo-local skills, and agent entrypoints.
- `WS-B` owns the context pack, bootstrap/project contracts, validation evidence, commit, and push.
- `T-002` and `T-003` depend on runtime installation and may proceed independently after `T-001`; `T-004` joins both streams.

## Milestone Strategy

1. Install runtime and preserve existing repository assets.
2. Adapt entrypoints and seed evidence-backed context/contracts.
3. Validate Delano and the real application.
4. Commit and push one scoped baseline.

## Rollout Strategy

- Land all bootstrap files in one private `main` commit after validation.
- Delano contracts become available immediately; Codex hooks remain opt-in until the operator enables and trusts them.
- Future runtime refreshes use `--no-project-state --force` so local `.project` state is preserved.

## Test Strategy

- Run `delano validate` and placeholder searches across entrypoint and context files.
- Run `npm test`, `npx tsc --noEmit -p .`, `npm run lint`, and `npm run build`.
- Inspect `git diff --check`, diff scope, skill presence, entrypoint contents, remote privacy, commit, and push status.

## Rollback Strategy

- Before commit, remove or revise only the untracked bootstrap assets and explicit entrypoint diffs.
- After commit, use a normal revert commit if the baseline must be backed out; never rewrite shared history.
- Delano does not alter application runtime or database state, so rollback requires no data migration.

## Remaining Delivery Risks

- Full repository checks may expose pre-existing failures unrelated to Delano; record rather than conceal them.
- The installed hook uses shell-style command substitution in `.codex/hooks.json`; activation is deferred to an operator trust flow and is not part of application validation.
