---
timestamp: 2026-09-13T16:25:33Z
status: done
task: T-004
stream: WS-A
---

# Shared skills release complete

- PR 13 merged at 16:19:40 UTC. Verified reviewed head: `0a48998329d697f5016ebf71bdca33ae636ed738`; squash merge: `ae692afe74fa958ce8038ae38858f9c18f936c45`. Codex completed the full review at 16:14:13 UTC with no further issues (comment 5654451887). All comments and threads were checked again before the merge; none remained unresolved. CI run 34767623003 passed the app and both CLI jobs. Netlify's informational page-change check was neutral; preview and routing checks passed.
- Production deployment `6aa6cd1e2feef300089b0d9b` published the exact merge commit at 16:21:16 UTC. Checks at 16:22 UTC passed for the homepage, docs, Skills page, health endpoint, private caching, and unauthenticated API/MCP rejection. Both Skills migrations are applied; hosted table/RPC permission checks and live membership denial pass. Signed-in owner/member journeys and actual two-device sync were verified against disposable fixtures, without creating production user data.
- Local verification: 212 app tests, 39 primary CLI tests, 20 legacy CLI tests, 34 pgTAP assertions, strict types, lint (six existing warnings), production build, brand audit, Delano validation, desktop/mobile browser acceptance, two-model MCP onboarding, maximum-size bundle round trips, and actual installed-tarball device sync.
- The maintainer completed npm's publish approval. `@bvdm/strap@0.2.0` was published at 16:25:02 UTC and is the registry's `latest` release. Its SHA1 `6620a8b70c2c7372380333ef10ca89d6eb56a2b3` matches the reviewed tarball. A fresh installation from the registry returned version 0.2.0 and passed real two-device installation, publication, update, binary integrity, and divergent-conflict preservation at 16:25:33 UTC.
- All release gates are satisfied. The publish processes have ended, and no background agent watcher remains.
- The root checkout was fast-forwarded to the merge and its app/CLI dependencies aligned. Unrelated local skill changes were preserved. The Tailscale demo and its user-added skills remain available; its sign-in bridge issues fresh fictional sessions on demand.

## Outcome review

The requested outcome is met: publish a skill once, retrieve and update it on a second device, and discover its instructions through a profile-scoped agent connection. Browser and CLI flows preserve supporting assets, enforce Personal/Company permissions, and stop on conflicting edits. Sync remains explicit; named environments and per-agent manifests remain separate roadmap work. Hosted sign-in and user data were not modified during fixture verification.

Review exposed resource accounting, encoding, and filesystem binding edge cases; each confirmed finding has a focused repair and regression or runtime evidence. No new Delano rule, skill, schema, or fixture convention is proposed for adoption in this closeout. Existing OpenWiki automation and hosted email-theme follow-ups remain outside the completed shared-skills contract.
