---
type: research_progress
project: remove-supabase
slug: supabase-surface-inventory
created: 2026-09-13T17:49:10Z
updated: 2026-09-13T17:49:10Z
---

# Progress: Supabase surface inventory

## 2026-09-13T17:49:10Z

- Opened research intake for project `remove-supabase`.
- Primary question: What does Strap use from Supabase today, how large is each surface, and what replaces each piece?

## 2026-09-13T18:05:00Z

- Counted every Supabase call site, auth method, migration construct, RLS policy, realtime, storage, Vault, and pg_cron use with ripgrep.
- Read the hosted row counts through the service key. Only counts were read.
- Checked Better Auth capabilities through Context7 for password hashing overrides, UUID ids, Next.js handlers, email hooks, and social providers.
- Wrote `findings.md` and folded the results into the spec, plan, decisions, six workstreams, and twenty tasks.

## Validation Evidence

- `delano validate` reports zero errors and zero warnings after the project, research, workstreams, and tasks were created.

## Handoff Summary

- The plan is ready for Bart's decisions on D-1 (host) and D-3 (presence) and for the go-ahead on WS-A.
