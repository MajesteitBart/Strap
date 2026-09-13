---
timestamp: 2026-09-13T15:53:00Z
status: in-progress
task: T-004
stream: WS-A
---

# Storage and import review repairs

- Codex review 5191165806 completed on 5b0f669 and identified four issues: list/history queries materialized full bundles, retained storage lacked an aggregate quota, archive retries returned conflicts, and browser folder imports silently discarded executable flags.
- Forward migration `20260913153559_bound_skill_storage.sql` caches small summaries, file counts, and encoded byte sizes. Publication holds the existing profile lock while enforcing a 64 MiB current-plus-history budget. It retires the oldest historical copies first, preserves each current revision, and rolls back the entire publication if current data cannot fit. Archived current data counts toward the same budget. Lost-response archive retries return the existing archived revision.
- The browser displays the storage budget, refreshes actual retained history after publishing, and requires users to review executable settings for folder imports with supporting files. CLI and downloaded JSON imports retain their recorded flags. Chrome verified the disabled publish gate, explicit acknowledgement, executable flag persistence, refreshed history, and reported storage usage. Existing user-added demo skills remained intact.
- A second disposable Supabase instance was reset from all migrations without disturbing the interactive demo database. All 34 pgTAP assertions pass, including near-limit bundles, pruning, preserved current versions, quota rejection rollback, metadata shape/accounting, archive at capacity, and lost-response retry. The 212 app tests passed for this repair batch; final strict types, lint (zero errors, six existing warnings), and production build also pass.
- The forward migration was then applied non-destructively to the demo and intended hosted project. Remote migration history matches local. Read-only hosted checks verify anonymous table/RPC denial, service table access, and rejection without live membership. No production user data was created. Supabase advisors report existing legacy SECURITY DEFINER grants and disabled leaked-password protection; the new Skills invoker RPCs are not among those findings.
- Final-head Codex review and CI, publication of the scoped CLI 0.2.0 tarball, verified merge, and production deployment remain pending.
