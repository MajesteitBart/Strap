---
id: WS-D
name: WS-D Platform services
owner: MajesteitBart
status: done
created: 2026-09-13T17:49:12Z
updated: 2026-09-13T21:47:30Z
operating_mode: multi-stream
---

# Workstream: WS-D Platform services

## Objective
Replace Supabase Vault, Storage, Realtime, and pg_cron with first-party equivalents.

## Owned Files/Areas
`lib/api-key-vault.ts`, `components/strap/api-key-vault-screen.tsx`, `app/api/app/profile/avatar/route.ts`, the new avatar serving route, the channel code in `components/strap/strap-provider.tsx`, `app/api/internal/maintenance/route.ts`, `.github/workflows/maintenance.yml`, and `app/api/health/route.ts`.

## Dependencies
T-008 for the repository layer. T-007 for user avatar columns.

## Risks
Vault key management and rotation. Image caching correctness. Losing the fast cross-session refresh that broadcast provided.

## Handoff Criteria
Integration tests cover Vault create, reveal, rotate, and delete, avatar upload and serve, and the retention job. Health reports database and auth with the current JSON shape.
