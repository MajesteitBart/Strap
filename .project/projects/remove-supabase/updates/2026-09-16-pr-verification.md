# Feature branch verification and PR preparation

Bart authorized continuing the migration, committing and pushing the feature branch, and the babysit review-to-merge workflow. The branch is `feature/remove-supabase`; the intended base is `main`.

## Verification

- Local Postgres started and the baseline migration applied successfully.
- Full database-enabled Node suite: 287 passed, zero failures or skips.
- Database subset: 81 passed.
- Production build and standalone TypeScript check passed.
- ESLint: zero errors, six existing navigation warnings.
- Primary CLI: typecheck and 39 tests passed. Legacy CLI: typecheck and 20 tests passed.
- Brand audit and Delano validation passed.
- The built application's local HTTP/API/MCP rehearsal passed, including persistence, avatars, audited Vault reveal, scoped credentials, device authorization, Company permissions and session revocation.

## Repair during review

Four simultaneous refresh requests all succeeded against the same refresh token. Rotation now claims the live token with a conditional database update and only the successful claimant can issue a replacement. Grant-read failures also stop rotation before consuming the token. The runtime rehearsal asserts exactly one success and three rejected replays. CI now runs that rehearsal against the production build and its isolated Postgres service.

## Release boundary

Netlify's live site configuration tracks `main` with builds enabled. Its published commit was `3d79a20c81765df390f9469759c33172f4c81345` when inspected. Bart authorized setting up a hosted database on Neon or Railway using available credentials. BWS has no provider key in the personal project; the existing Railway login is valid. Hosted preparation continues before merge so deployment cannot switch application code before its database is ready.

Railway Postgres 18 with transaction pooling is provisioned. An isolated hosted rehearsal imported 2 users, 3 profiles and all 37 application tables with matching counts. The PR preview now has rehearsal-only environment values; existing production values were checked unchanged, and the token encryption key matches the source. BWS holds database credentials, the trusted pooler certificate/key, and separate auth, Vault and maintenance secrets. Live provider sign-in, delivered mail, production import and decommissioning remain open. Independent authorization review remains pending until the PR's Codex review completes on the final head. Raw logs and resumable babysit state stay under ignored `.agents/logs/remove-supabase/`.

## Hosted connection repair

The pooler requires a stable trusted certificate with its public hostname in the SAN. DATABASE_SSL_CA is scoped to the target connection; STRAP_SOURCE_DATABASE_SSL_CA independently verifies the source. Neither URL options nor custom CAs disable verification. Hosted imports require an exact --target host:port/database and still reject populated destinations. The first hosted import rolled back because the driver inferred JSON and serialized an already serialized payload again. Binding it as text before the JSON cast fixed the import. All 287 tests, production build, TypeScript and lint passed after these changes.

## Hosted runtime evidence

Netlify preview deployment 6aa9fb0ce6db7900096a1943 serves commit 617ddf13e2897e87e41449363a4c6555fb44c459. Health confirms DB and auth availability. An existing password account signed in and loaded persisted state. Existing legacy bearer reads passed; the copied token ciphertexts and hashes match the source and decrypt with the retained key. The imported Vault value matches the source after decryption, checked only in memory. Both imported accounts use credentials; the source has no unexpired OAuth token, so existing OAuth continuation could not be exercised.

A synthetic-user rehearsal against the deployed preview passed Personal edits, avatar bytes, audited Vault create/reveal/delete, scoped MCP access and denied writes, OAuth device approval, refresh rotation with exactly one concurrent winner, Company membership/proposal/history/restore/reordering/hidden-section checks, and sign-out. Shared-skill publication passed through the hosted SQL procedure. Synthetic accounts and their owned data were removed afterward. Netlify's CDN returned full matching avatar bytes (200) for conditional GETs; the local origin returns the expected 304.

The separate production destination has its baseline schema ready and remains empty. BWS also backs up the retained token-encryption key. Production environment values and the published Supabase application are unchanged. A fresh source import must run during the approved write-free cutover window. Live provider and delivered-email checks remain outstanding. GitHub Actions run 35047089801 passed all three jobs on 617ddf1; Codex review of that head was still running when this evidence was recorded.

## Codex CI coverage repair

Codex review 5217859493 on 1d402459943afc5ae81cfc497b8390b26a0153bd found that Bash expanded tests/**/*.test.ts to tests/db only, silently omitting the top-level contracts from CI. The npm test command now names both tests/*.test.ts and tests/db/*.test.ts. Running npm test through Git Bash with the canonical local database environment passed all 287 tests with zero skips. The earlier local full-suite results were valid; the earlier CI green jobs did not establish root-suite coverage. The repaired head requires fresh CI and review.
