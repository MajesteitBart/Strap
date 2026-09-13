---
name: Shared skills
slug: shared-skills
owner: MajesteitBart
created: 2026-09-13T13:38:18Z
updated: 2026-09-13T13:38:18Z
---

# Decisions: Shared skills

## Active Decisions
- Standard SKILL.md bundles belong to a Personal or Company profile and remain separate from context sections and Vault secrets.
- Use service-only invoker RPCs with live membership checks, serialized publication, content digests, and up to 20 retained revisions. A 64 MiB profile budget counts encoded current bundles and version documents, pruning the oldest history first while preserving every current revision. PT409 reports an optimistic conflict without triggering PostgREST transaction retries.
- Cache metadata and byte accounting on writes so library and history listings do not materialize complete bundles. Folder imports require an executable-permission review because browsers do not expose Unix file modes; CLI and JSON transfers preserve recorded flags.
- Share a pinned YAML-based bundle validator between the app and CLI. Reject unsafe paths and aliases; preserve binary files and executable metadata.
- Sync is explicit and binds one profile to one directory. Preflight conflicts and keep replacement backups outside agent discovery directories. Downloading a skill never runs its scripts.
- Use the existing Codex and Claude directory conventions and MCP grants. No marketplace, background daemon, new identity layer, or automated skill import is included.

## Superseded Decisions
- None.

## Open Decision Questions
- No unresolved product decisions. Review, CI, scoped CLI publication, merge, and production verification are complete; see the release completion update.
