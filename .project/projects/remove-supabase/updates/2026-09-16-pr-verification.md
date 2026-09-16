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
