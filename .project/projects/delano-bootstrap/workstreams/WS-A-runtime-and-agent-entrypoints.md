---
id: WS-A
name: WS-A Runtime and agent entrypoints
owner: MajesteitBart
status: done
created: 2026-07-22T05:19:56Z
updated: 2026-07-22T05:24:12Z
operating_mode: feature
---

# Workstream: WS-A Runtime and agent entrypoints

## Objective

Install the canonical Delano runtime and provide shared agent entrypoints without replacing Creed's existing rules or application structure.

## Owned Files/Areas

- `.agents/`, `.delano/`, `.codex/`, `HANDBOOK.md`, and `install-delano.sh`.
- `AGENTS.md`, `CLAUDE.md`, and repo-local frontend skills.

## Dependencies

- Existing clean repository and authenticated private origin metadata.
- Delano CLI and official next-forge skill source.

## Risks

- Overwriting the repo-owned `creed-repo` skill or maintaining conflicting agent instructions.
- Applying a new-project frontend initializer over the established application.

## Handoff Criteria

- Runtime installation succeeds conflict-safely.
- `AGENTS.md` contains the first-turn workflow and source-of-truth map.
- `CLAUDE.md` contains only `@AGENTS.md`.
- `shadcn`, `next-forge`, and `creed-repo` skills are present.
