# Progress

## What Changed

- The active `strap-rebrand` project establishes Strap as the canonical public product at `https://strap.bvdm.ai` with the positioning "Bootstrap your agents with context, skills, and secrets." On 2026-07-23 the user revised public messaging to "Bootstrap your agents with context, skills, and keys."; the technical model (vault, secret references, `secret://` URIs) keeps "secrets".
- The supplied Strap logo, warm worktable visual system, resource colors, and typography now drive the public homepage, metadata, public chrome, authenticated UI, auth, and email surfaces.
- New profile exports and GitHub integrations default to `strap.md`. Existing stored paths remain authoritative; default reads fall back to `creed.md`; pushes refuse to create a divergent second file.
- MCP discovery and agent guidance are Strap-first. Existing `creed_*` tools, `creed://profile`, `/api/creed/**`, credential prefixes, `X-Creed-CLI-Agent`, and the `https://creed.md` protocol origin remain explicit compatibility contracts.
- The separate `packages/strap/` package implements `@bvdm/strap` and the `strap` executable with isolated configuration and credentials. It does not modify `packages/creed-cli/`.
- Root documentation, environment examples, package metadata, repository guidance, and durable context now describe Strap while naming legacy identifiers only where compatibility requires them.
- `strap.bvdm.ai` is live as an unproxied Cloudflare CNAME to the existing Netlify production site. Netlify serves it as a verified domain alias with Strap's production build and canonical metadata.
- The earlier `headless-access-secret-vault` project delivered scoped API keys, OAuth device authorization, and Supabase Vault-backed secret storage. Its user-authored Strap CLI workstream remains preserved as the implementation contract source.

## Evidence So Far

- Delano research, Spec, plan, workstreams, decisions, and atomic tasks validate for `strap-rebrand`.
- Fable approved the plan after compatibility blockers were resolved and later passed the grounded agent-contract review.
- The root suite passes 153/153 tests on Node 26, strict TypeScript passes, ESLint reports zero errors and one existing warning, and the final production build succeeds with 96 generated routes.
- The exact rebrand audit scans 447 files and classifies 23 retained occurrences through 22 reviewed D-004/D-011 allowlist entries.
- `@bvdm/strap` passes typecheck, ESLint, and 20 tests. `npm pack --dry-run`, real packaging, and an external tarball install smoke returned Strap help and version `0.1.0`.
- A bounded, grounded Fable release review passed with no blockers. Its three actionable non-blocking findings were resolved in the same pass.
- Cloudflare API and public DNS checks confirm `strap.bvdm.ai` resolves to `creed-bvdm.netlify.app`; HTTPS returns 200 with a valid Netlify certificate.
- Netlify Git-backed production deploy `6a61edde4d776c00087bd686` is ready from commit `1499389` and serves the revised keys title and copy, `https://strap.bvdm.ai/home` canonical URL, healthy API/database/auth checks, and Strap OAuth/MCP discovery. The Git build failure came from the root TypeScript project scanning the independent `packages/strap` CLI without its separately installed dependencies; both CLI packages are now excluded from the web app project and retain their own type-checks and tests. The release uses Next.js `16.2.11` and a Webpack production bundle because Netlify's local Windows edge packager does not trace the generated middleware runtime; the equivalent clean Linux Netlify build and edge packaging pass.
- T3 collaborative browser evidence covers the production homepage at mobile, tablet, and desktop widths plus visible keyboard focus. Network requests were clean; the browser reported only Netlify's non-blocking report-only CSP warning.

## What Is Next

- Restore the Computer Use native Windows helper, then complete the requested authenticated-route browser pass before closing T-009.
- Continue serving the `creed.md` compatibility origin during the migration window.
- npm publication, GitHub repository rename, and other external mutations remain operator-approved release actions.

## Remaining Risks

- OpenWiki still reflects its last generated Creed-era snapshot and must be regenerated from source rather than hand-edited.
- The old production origin must continue serving MCP/OAuth endpoints directly during the migration window.
- Dependency audits still report seven inherited advisories in the dependency graph after the Next.js patch upgrade (one low, one moderate, and five high); resolving unrelated transitive advisories was not included in this deployment fix.
- Computer Use loaded its safety and confirmation guidance, but runtime bootstrap failed because the native Windows helper pipe was unavailable. T3 Preview supplied production public-route evidence, but the specifically requested Computer Use authenticated-route pass remains blocked.
