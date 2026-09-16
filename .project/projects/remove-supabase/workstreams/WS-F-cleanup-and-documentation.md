---
id: WS-F
name: WS-F Cleanup and documentation
owner: MajesteitBart
status: done
created: 2026-09-13T17:49:13Z
updated: 2026-09-13T21:48:27Z
operating_mode: multi-stream
---

# Workstream: WS-F Cleanup and documentation

## Objective
Remove every Supabase artifact from dependencies, configuration, skills, and scripts, and update docs, marketing copy, and the context pack.

## Owned Files/Areas
`package.json`, lockfiles, `next.config.ts`, `.netlify/netlify.toml`, `.agents/skills/supabase*`, `.claude/skills`, `skills-lock.json`, `scripts/`, `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `AGENTS.md`, `BOOTSTRAP.md`, `.env.example`, `components/marketing/stack-page-view.tsx`, `components/auth/backend-setup-screen.tsx`, and `.project/context/`.

## Dependencies
WS-C and WS-D complete. OpenWiki regenerates from sources after merge.

## Risks
OpenWiki pages stay stale until the scheduled regeneration. The brand audit allowlist references Supabase paths.

## Handoff Criteria
The active runtime, dependencies and configuration contain no Supabase SDK dependency. Historical/generated references and import compatibility are documented exceptions. `npm run audit:brand` and the full verification set pass.
