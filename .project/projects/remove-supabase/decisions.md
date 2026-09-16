---
name: Remove Supabase
slug: remove-supabase
owner: MajesteitBart
created: 2026-09-13T17:49:09Z
updated: 2026-09-13T17:49:09Z
---

# Decisions: Remove Supabase

## Active Decisions
- D-1: Start with local Postgres 17 in Docker Compose, accessed through the `postgres` driver and Drizzle ORM. Bart authorized this on 2026-09-13 with implementation on a feature branch. Hosted provisioning is deferred until local rehearsal; Neon remains the recommendation and the code stays portable.
- D-2: Use Better Auth for identity with UUID ids, email/password, Google, and X. Existing bcrypt hashes verify through a custom `verify` and are rehashed on success.
- D-3: Drop Company presence and broadcast. The adaptive poll remains the sync path. Revisit with Ably if Company usage grows.
- D-4: Store avatars in Postgres and serve them through a cached route. No object storage vendor.
- D-5: Encrypt Vault secrets in the application with AES-256-GCM under a dedicated `STRAP_VAULT_SECRET`, separate from the token key.
- D-6: Replace pg_cron with a secured maintenance route called by a GitHub Actions cron.
- D-7: Squash the 61 verified repository migrations into one Drizzle baseline. Git history preserves the originals. The `supabase/` directory is removed at cleanup.
- D-8: Replace RLS with explicit guards. No repository call accepts a client-supplied profile id without a membership check.
- D-9: Cut over in one scripted migration inside a maintenance window. Keep Supabase paused for 30 days.
- D-10: Reuse the existing Google OAuth app for the local rehearsal, per owner reply on 2026-09-13. Add the local Better Auth callback alongside the existing production callback.
- D-11: Store Better Auth rate limits in Postgres so enforcement survives serverless instance changes. Auth email tasks use Next.js `after` so delivery remains scheduled after the response; do not detach untracked promises on serverless.
- D-12: The owner deferred Google credential setup and the live sign-in rehearsal on 2026-09-13. The existing Google app remains selected. No Google credentials or redirect URIs were changed; preserve the existing Supabase callback. Live provider verification remains outstanding.

- D-13: Complete the local implementation after the owner deferred Google setup. Keep hosted operations and independent review as explicit release gates. The local probe passed; no subagents are authorized or used.
- D-14: Use the verified catalog (37 application tables, 45 policies, 61 migrations). Preserve named server service contexts for internal operations behind their domain guards; viewer reads/writes always use explicit scopes. The import uses direct Postgres and does not need the removed SDK. Refuse populated targets with no force flag.

- D-15: Split the independent authorization review from the implemented guard task into T-021. Cleanup and local rehearsal can close against verified code while the hosted cutover retains an explicit T-021 dependency. This avoids marking a review as passed merely to advance local task rollups.

## Superseded Decisions
- None.

## Open Decision Questions
- D-1: Choose the production host after local rehearsal.
- The maintenance window date for T-017.
