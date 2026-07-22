# Progress

## What Changed
- The `headless-access-secret-vault` Delano project added Creed-scoped headless API keys, RFC 8628 device authorization, normalized MCP credential enforcement, and Supabase Vault-backed API-key storage.
- Connections now manages one-time-visible headless keys and links to device approval; the signed-in `/vault` surface supports metadata list, explicit reveal, rotation, and deletion with conservative Company role gates.
- Claude Fable reviewed the project before execution. Its fallback, mutation-token, device abuse-control, and Vault function-hardening blockers were incorporated before implementation.
- On 2026-07-22, Delano 0.3.5 was installed into the existing private Creed repository without overwriting the repo-owned `creed-repo` skill.
- The `shadcn` skill is available under `.agents/skills/`; the repo-local next-forge skill was removed by owner direction because Creed does not use that starter architecture.
- `delano-bootstrap` now tracks runtime, entrypoint, context, validation, commit, and push evidence.
- Delano validates with zero errors and warnings. Creed passes 138 tests, strict TypeScript, ESLint with zero errors, the Next.js production build, and a clean local Supabase migration reset.
- The linked hosted Supabase project now matches local migration history through `20260722120000`. Hosted PR-preview QA passed headless-key MCP authentication and revocation, the complete OAuth device grant and revocation flow, Vault create/reveal/rotate/delete, and metadata-only audit events.
- The `npm test` script no longer single-quotes its glob, so Windows executes the real suite instead of reporting zero discovered tests.

## Why It Changed
- Bart requested secure non-interactive access for headless agents such as Hermes Agent and OpenClaw, plus a Bitwarden Secrets Manager-like API-key Vault backed by Supabase Vault.
- Bart explicitly requested that Creed be bootstrapped from the private Delano setup brief after the repository was understood and running.

## What Is Next
- Merge PR #2, deploy the application release, and exercise one real Hermes Agent or OpenClaw connection against the production MCP URL.

## Remaining Risks
- T3 Preview automation remained unavailable at the broker, so hosted QA used local Playwright CLI. Synthetic secrets, credentials, OAuth clients, tokens, Vault rows, and browser artifacts were removed after verification; only metadata audit evidence remains.
- Codex hooks remain inactive until the operator enables hooks and approves repository and hook trust.
- Next-forge is intentionally absent because its initializer creates a new project and does not safely retrofit this established app.
- Node emits existing module-type warnings while running TypeScript tests, ESLint reports one existing unused-disable warning, and the build reports a Node deprecation warning; none failed verification.
