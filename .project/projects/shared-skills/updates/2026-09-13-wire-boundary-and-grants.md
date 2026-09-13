---
timestamp: 2026-09-13T16:06:00Z
status: in-progress
task: T-004
stream: WS-A
---

# Wire boundary and hosted grant verification

- Codex review 5191294228 completed on b4ef56d and found that control-byte UTF-8 assets could expand beyond the JSON limit despite fitting the documented raw-byte limit. The shared encoder now chooses base64 when an asset's escaped JSON value would be larger. SKILL.md remains editable UTF-8. Bytes and executable flags are preserved.
- The new regression covers exactly 2 MiB of control-byte content with both a small manifest and a 512 KiB manifest, verifies the encoded request remains below 6 MiB, checks byte-for-byte recovery, and checks normalization is stable. All 39 CLI tests and 212 app tests pass; lint has zero errors and six existing warnings; strict types and production build pass.
- The same two boundary bundles passed real authenticated browser API publication, database persistence, download integrity, and lost-response archive retries against the disposable database. Request sizes were 2,796,739 and 5,242,990 bytes. Only the newly created test skill IDs were removed afterward. The rebuilt scoped tarball also passed the actual two-device CLI process flow.
- A separate read-only hosted audit confirmed production grant drift in older billing, ownership, usage, and internal RPCs. The latest committed migrations and a fresh local reset already deny client execution. Their existing grants were restored in production as an operational repair, without modifying function bodies, migration history, or data rows. Effective privilege checks now confirm all 11 inspected functions deny anonymous and signed-in client execution while preserving required service access. Remaining advisor notices concern existing RLS helpers and password protection, not these service-only operations or the new Skills functions.
- The Tailscale demo sign-in bridge now creates a fresh fictional local session on each visit. The browser link and user-added demo skills were verified again without resetting the database. Final-head review, CI, CLI publication, merge, and production verification remain pending.
