# Bootstrap Creed with Delano

## Source Brief

This retrofit is based on Bart's private `Development/BOOTSTRAP.md` brief, reviewed on 2026-07-22, together with the existing `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `AGENTS.md`, OpenWiki quickstart, package scripts, and current source tree. The private source brief is not copied into this repository.

## Goal

Keep Creed ready for agentic implementation through Delano while preserving its existing Next.js application, repository conventions, security boundaries, and Git history.

## Read First

1. `README.md`
2. `AGENTS.md`
3. `.project/context/README.md`
4. The relevant files in `.project/context/`
5. The active contract under `.project/projects/`
6. `openwiki/quickstart.md` and task-relevant generated references

## Repository and GitHub

- Local repository: the current Creed checkout.
- Remote: `https://github.com/MajesteitBart/Creed.git`.
- Visibility: private at bootstrap time.
- Default branch: `main`.
- Owner and required collaborator: `MajesteitBart`; no separate collaborator invitation is needed because the required collaborator owns the repository.
- This retrofit must not create another repository. Issues, pull requests, comments, deployments, or other external mutations require separate approval.

## Human and Agent Entrypoints

- Preserve `README.md` as the confirmed human/product entrypoint; do not replace it with starter copy.
- Keep `AGENTS.md` compact enough to retrieve rules quickly while preserving Creed's non-negotiable product, security, and verification invariants.
- Keep `CLAUDE.md` as the single line `@AGENTS.md`; do not maintain a second authored instruction set.
- Treat `.agents/` as the canonical Delano runtime. `.claude/` exists only for compatibility.

## Install or Refresh Delano

Initial installation:

```bash
delano install --target . --agents 'claude,codex' --yes
delano onboarding --approve-agents-analysis
```

After `.project` becomes repository-owned, refresh runtime files without overwriting local project state:

```bash
delano install --target . --no-project-state --force --yes
```

Codex hooks are installed in `.codex/hooks.json` but remain inert until hooks and repository trust are enabled by the operator.

## Frontend Bootstrap Decision

Creed already has an established Next.js 16 frontend and is not a next-forge monorepo. Do not run `npx next-forge@latest init` over this checkout because that command initializes a new project rather than retrofitting an existing app. The required `shadcn` and `next-forge` skills live in `.agents/skills/`; use them only when their task triggers apply.

## Context Workflow

Use `.agents/skills/manage-context/SKILL.md` to maintain `.project/context/`:

1. Audit every context file for template text, stale claims, contradictions, and missing evidence.
2. Cross-check against current source, `README.md`, `AGENTS.md`, OpenWiki, and active Delano contracts.
3. Record only confirmed facts; keep uncertainty explicit.
4. Run `delano validate` and the Delano status checks before handoff.

## Project Contracts

The bootstrap creates one project because the supplied scope contains one bounded body of work:

- `.project/projects/delano-bootstrap/`: install the runtime, adapt entrypoints, seed context, validate, and publish the baseline.

It is decomposed into `WS-A` for runtime and agent entrypoints and `WS-B` for project context and validation. Do not invent future Creed roadmap projects during bootstrap. Create later projects from explicit product outcomes when they become active.

## Verification

Run from the repository root:

```bash
delano validate
npm test
npx tsc --noEmit -p .
npm run lint
npm run build
```

Also confirm that `AGENTS.md`, `CLAUDE.md`, `README.md`, `BOOTSTRAP.md`, and `.project/context/` contain no bootstrap placeholder markers. If a check cannot run, capture the reason and do not claim it passed.

## Completion Evidence

Report the repository and remote, private/owner status, source material processed, installed Delano version, active project decomposition, skipped conditional steps and reasons, validation results, branch, commit hash, push result, and any remaining risk.
