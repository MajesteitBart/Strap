---
id: WS-D
name: WS-D Strap CLI Package
owner: MajesteitBart
status: done
created: 2026-07-23T01:44:12Z
updated: 2026-07-24T13:57:09Z
operating_mode: feature
blocked_owner: MajesteitBart
blocked_check_back: 2026-07-24
---

# Workstream: WS-D Strap CLI Package

## Objective

Deliver a separately installable Node.js CLI package named `@bvdm/strap` with a `strap` executable, a documented command contract, and release evidence that proves the published artifact is usable without changing or replacing `creed-cli`.

## Owned Files/Areas

- New package source, tests, package metadata, and user documentation under `packages/strap/**`.
- The `strap` executable entrypoint, configuration boundaries, structured output, and exit-code behavior.
- Package build, typecheck, test, pack, local-install smoke, and release evidence.
- Minimal root documentation or package-discovery updates required to make the new package findable.

## Dependencies

- An explicit pre-implementation decision describing Strap's commands, intended users, and relationship to `creed-cli`.
- Confirmed publish access to the `@bvdm` npm scope. The public registry returned no visible `@bvdm/strap` package on 2026-07-23, but that does not prove scope ownership or private-package availability.
- Node.js 20+ and npm packaging behavior.
- WS-A server contracts if Strap consumes Creed API keys or OAuth device authorization.

## Risks

- Strap duplicates or ambiguously overlaps the existing `creed-cli` instead of owning a distinct workflow.
- The npm package publishes source or metadata without the built executable, executable permissions, or required runtime dependencies.
- Authentication material leaks through arguments, output, logs, configuration files, or package tests.
- Public package publication occurs before ownership, provenance, versioning, and rollback expectations are confirmed.

## Handoff Criteria

- The package manifest uses the exact name `@bvdm/strap`, requires Node.js 20+, exposes the `strap` executable, and includes only intended distributable files.
- Strap's command, configuration, authentication, output, and exit-code contracts are documented and tested before release.
- The package is strict TypeScript without `any`, has focused tests, and passes its build, typecheck, and test scripts.
- `npm pack --dry-run` and installation from the generated tarball confirm that `strap --help` and `strap --version` run outside the repository checkout.
- Existing `creed-cli` behavior and package metadata remain unchanged unless a separately approved compatibility change is required.
- Publishing to npm remains an explicit operator-approved action; the workstream records the published version and registry evidence after approval.

## Updates

- 2026-07-23T13:52:06Z: WS-D quality gate failed on unsafe root pack documentation and incomplete authentication/output/exit-code contract tests
