---
name: Bootstrap Delano for Creed
slug: delano-bootstrap
owner: MajesteitBart
status: active
created: 2026-07-22T05:19:56Z
updated: 2026-07-22T05:24:10Z
outcome: Creed has a validated Delano runtime, repository-specific context pack, agent entrypoints, and a clean pushed baseline.
uncertainty: low
probe_required: false
probe_status: skipped
probe_decision_rationale: This is a reversible repository workflow retrofit with an established codebase and explicit bootstrap instructions.
operating_mode: feature
---

# Spec: Bootstrap Delano for Creed

## Executive Summary

Retrofit Delano into the existing Creed repository as a delivery contract and runtime. Preserve all product, architecture, security, documentation, and Git boundaries while adding repository-specific context, atomic task tracking, evidence, and thin agent entrypoints.

## Problem and Users

Creed already has strong source documentation and an established application, but delivery intent and execution evidence are not represented as local lifecycle contracts. Bart and future coding agents need a consistent way to resume work, identify the current outcome, decompose it safely, and prove completion without relying on chat history.

## Outcome and Success Metrics

- `delano validate` passes with no repository-specific placeholder debt.
- `AGENTS.md`, `CLAUDE.md`, and `BOOTSTRAP.md` provide one coherent entrypoint and repeatable setup.
- `.project/context/` matches confirmed Creed reality and exposes uncertainty explicitly.
- The runtime and required frontend skills are installed without replacing existing code or the `creed-repo` skill.
- Creed's test, typecheck, lint, and production build checks pass, or any failure is recorded accurately.
- One scoped baseline commit is pushed to the existing private `main` branch.

## User Stories
- US-001: As the repository owner, I want Creed bootstrapped with Delano from local, reviewable contracts so future agent work starts with current context and verifiable delivery state.

## Acceptance Scenarios
- AC-001: Given Creed's existing repository, when Delano installs, then its runtime is present and existing repo-owned skills and source files remain intact.
- AC-002: Given multiple coding-agent entrypoints, when an agent starts work, then `AGENTS.md` is the authored instruction source and compatibility files point to it.
- AC-003: Given the installed starter context, when bootstrap completes, then every context file contains evidence-backed Creed facts with no generic placeholder text.
- AC-004: Given the completed retrofit, when validation and repository checks run, then their outcomes are captured and the scoped baseline reaches the private origin.

## Scope
### In Scope

- Delano runtime, viewer, hooks, handbook, validation scripts, templates, and repo-local workflow skills.
- Repository-specific `AGENTS.md`, `CLAUDE.md`, and `BOOTSTRAP.md` behavior.
- A maintainable `.project/context/` pack and one decomposed bootstrap project.
- Local validation, Creed repository checks, scoped commit, and push to the existing private origin.

### Out of Scope

- Product feature work, framework migration, database or environment changes, deployment, and production operations.
- Running a new-project initializer over the established Creed frontend.
- Inventing future roadmap projects or synchronizing external trackers.
- Copying private source material, personal information, or credentials into repository files.

## Functional Requirements

- FR-001: Install Delano conflict-safely and keep `.project` repository-owned after initialization.
- FR-002: Install the `shadcn` and official `next-forge` skills for the existing frontend.
- FR-003: Add a numbered first-turn workflow and source-of-truth map while preserving Creed invariants.
- FR-004: Maintain `CLAUDE.md` as the single line `@AGENTS.md`.
- FR-005: Convert starter context into confirmed, task-routed Creed context through `manage-context`.
- FR-006: Decompose only `delano-bootstrap` into workstreams and atomic tasks.
- FR-007: Validate contracts, application checks, placeholder absence, Git scope, and remote state.

## Non-Functional Requirements

- Installation and edits must be reversible through Git and must not overwrite unrelated work.
- No secrets, raw private paths, personal information, or unapproved public/external artifacts enter the baseline.
- Documentation stays retrieval-oriented and source code remains canonical for behavior.
- No new application dependency or production runtime behavior is introduced.

## Assumptions
- The existing `main` branch and private `MajesteitBart/Creed` origin are the intended baseline target.
- Bart's bootstrap request authorizes the Delano retrofit, agent-entrypoint edits, one scoped commit, and push described by the source brief.
- The repository's existing Next.js application is intentional and must not be replaced with next-forge starter architecture.

## Needs Clarification
- None. The repository goal, remote, owner, frontend status, and requested bootstrap source are confirmed.

## Hypotheses and Unknowns

- Hypothesis: Delano's installed contract validator accepts a feature-mode bootstrap project once all required sections, artifacts, and task evidence are present.
- Unknown until checks run: whether current application tests, typecheck, lint, and build remain green at this checkout.

## Touchpoints to Exercise

- `delano onboarding`, `delano validate`, task lifecycle rollups, and status output.
- Root agent entrypoints, `.agents/skills/`, `.project/context/`, and `.project/projects/delano-bootstrap/`.
- `npm test`, TypeScript, ESLint, and Next.js production build.
- Git diff scope, private remote metadata, commit, and push.

## Probe Findings

- A separate prototype probe is unnecessary. Delano installation is conflict-first and the repository is clean, so the retrofit can be validated directly and reverted through Git if needed.

## Footguns Discovered

- PowerShell parses an unquoted comma-separated `--agents` value as separate arguments; quote `claude,codex`.
- `npx next-forge@latest init` initializes a new project and is unsafe over this established application.
- Delano installs generic `.project/context/` templates that must be replaced before active delivery.
- Codex hooks are installed but remain inactive until explicitly enabled and trusted.

## Remaining Unknowns

- Application verification and remote push results remain unknown until the final validation task completes.

## Dependencies

- Local Delano CLI 0.3.5 or a compatible current `@bvdm/delano` package.
- Node.js and installed repository dependencies for Creed checks.
- Authenticated GitHub CLI access to the private origin for metadata verification and push.

## Approval Notes

- Bart explicitly requested the bootstrap on 2026-07-22 and directed the agent to follow the private setup brief.
- The source brief pre-approves the coherent bootstrap baseline commit and push, but no public or unrelated external action.
