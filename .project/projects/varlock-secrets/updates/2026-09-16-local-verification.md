---
timestamp: 2026-09-16T02:20:00Z
status: done
task: T-002
stream: WS-A
---

# Local verification

- Branch: `feat/varlock-strap-secrets`. Scope is local implementation; no remote database, deployment, npm publication, tracker write, or subagent work occurred.
- Application suite: 222 passing tests, including eight new tests executing real key, Vault, and route code with isolated persistence. They cover explicit grants, old-key denial, profile isolation, hash mismatch, expiry, revocation, membership removal, Company role changes, bounded requests, rate limits, and audit failure without plaintext output.
- Provider: typecheck, six tests, and package dry-run pass. Real Varlock 1.19 loads a relocated CommonJS bundle, resolves default/named instances, masks values with `@defaultSensitive=false`, and injects secrets without forwarding its internal access key. Transport checks cover origin restrictions, nonredirecting POST, timeout configuration, no caching, rotation, value preservation and safe diagnostics.
- Database: `npx supabase db reset --local --no-seed` passed on an isolated disposable instance. All 44 pgTAP checks pass, including ten new assertions for empty grant defaults, RLS, direct browser/anonymous access denial, null rejection and the 100-item bound. Existing local instances and production were untouched.
- Live application: synthetic users and actual session-authenticated HTTP calls verified Vault creation, key creation, empty-grant denial, successful reveal, metadata-only key attribution, Company demotion, denied delegation by members, restored admin access, expiry, revocation, and session denial. An actual Varlock child process then fetched the live local Vault item and received only the resolved value.
- Browser: Playwright created a key with one selected secret, dismissed its one-time credential, verified grant counts, and copied a `secret://` reference without revealing plaintext. At 390px width there is no horizontal overflow. Visual inspection found crowded Vault controls; stacking controls below metadata on mobile fixes it. Private screenshots remain under ignored `output/playwright/`.
- Production build, strict TypeScript, lint and brand audit pass. ESLint reports six existing navigation warnings. Delano validates with `--allow-worktree-state`; its remaining warning is the uncommitted worktree posture until the local commit.
- Environment findings: this checkout initially had no installed application dependencies or `.env.local`. The first build needed `NEXT_PUBLIC_SITE_URL`. A temporary environment pointed only to the isolated instance. Windows junction paths broke Turbopack request handling; running Webpack from the resolved checkout path enabled live verification without changing application configuration.
- Packaging: four shipped files (bundle, package metadata, README and license), no application runtime dependencies. Varlock is a peer/development dependency and esbuild is a development-only bundler. The provider dependency audit is clean.
- Handoff requirements: apply `20260916015234_headless_vault_item_grants.sql` before deploying the application, then publish/install the provider. Existing keys remain ungranted. The package README documents local tarball installation before publication and the fact that revocation cannot erase values already delivered to a running process.
