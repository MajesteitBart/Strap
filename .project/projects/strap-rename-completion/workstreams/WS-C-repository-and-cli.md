---
id: WS-C
name: WS-C Repository and CLI
owner: repository-cli-stream
status: done
created: 2026-07-24T19:59:41Z
updated: 2026-07-24T20:22:57Z
operating_mode: multi-stream
---

# Workstream: WS-C Repository and CLI

## Objective

Make repository guidance, exhaustive audit tooling, generated documentation, repo-local skill content, and the Strap CLI consistently Strap-first.

## Owned Files/Areas

- Root documentation/configuration, `.project/context/`, scanner/allowlist, OpenWiki inputs and outputs, `.agents/skills/creed-repo/` content, `package.json`, `packages/strap/`, and compatibility CLI tests.

## Dependencies

- Current executable source is canonical for generated documentation and scanner classifications.

## Risks

- Overwriting unrelated worktree changes, hand-editing generated docs, incomplete scan coverage, and package release drift.

## Handoff Criteria

- T-005 and T-006 pass scanner, documentation, and package-focused checks and provide release artifacts.
