# Progress

## What Changed

- The completed `strap-rebrand` project establishes Strap as the canonical public product at `https://strap.bvdm.ai` with the positioning "Bootstrap your agents with context, skills, and secrets." On 2026-07-23 the user revised public messaging to "Bootstrap your agents with context, skills, and keys."; the technical model (vault, secret references, `secret://` URIs) keeps "secrets".
- The supplied Strap logo, warm worktable visual system, resource colors, and typography now drive the public homepage, metadata, public chrome, authenticated UI, auth, and email surfaces.
- New profile exports and GitHub integrations default to `strap.md`. Existing stored paths remain authoritative; default reads fall back to `creed.md`; pushes refuse to create a divergent second file.
- MCP discovery and agent guidance are Strap-first. Existing `creed_*` tools, `creed://profile`, `/api/creed/**`, credential prefixes, `X-Creed-CLI-Agent`, and the `https://creed.md` protocol origin remain explicit compatibility contracts.
- The separate `packages/strap/` package implements `@bvdm/strap` and the `strap` executable with isolated configuration and credentials. It does not modify `packages/creed-cli/`.
- Root documentation, environment examples, package metadata, repository guidance, and durable context now describe Strap while naming legacy identifiers only where compatibility requires them.
- A 2026-07-24 follow-up inventory found substantial rebrand drift that the original narrow brand gate did not cover. The review spans visible copy, design language, active documentation, generated docs, CLI attribution, agent protocols, schema defaults, tests, internal paths, compatibility contracts, and historical delivery truth.
- The rename-first follow-up now makes Strap canonical across active product, public website, CLI, MCP and HTTP discovery, package metadata, source modules, route/component paths, repository guidance, OpenWiki, tests, assets, configuration, and new persisted defaults. Retained Creed identifiers are explicit compatibility or immutable historical contracts.
- The GitHub repository is now `MajesteitBart/Strap`; the rename-first tree is published in `main` history as `c92006069bea3beaece280e6c69e51918ca7e40d`, the canonical and redirected remotes resolve to the same current descendant, and local `origin` uses the Strap URL.
- The `strap-visual-redesign` contract applied the approved worktable system to every remaining surface on 2026-09-13: shared tokens with a warm dark twin, typography, radii, and primitives; the inner public pages; authentication, consent, device, invite, backend setup, and transactional email; and the signed-in shell plus status colours across the product UI. Behaviour, permissions, persistence, agent contracts, and compatibility identifiers are unchanged.
- `strap.bvdm.ai` is live as an unproxied Cloudflare CNAME to the existing Netlify production site. Netlify serves it as a verified domain alias with Strap's production build and canonical metadata.
- The earlier `headless-access-secret-vault` project delivered scoped API keys, OAuth device authorization, Supabase Vault-backed secret storage, and the reviewed Strap CLI package workstream. Its remediation record covers the safe pack command, OAuth credential lifecycle, output and exit-code contracts, external install smoke, and publication guard.

## Evidence So Far

- Release verification PR 10 merged as `2b1de05` after a clean Codex review on `5063384` and green PR checks. All three jobs passed on the first main run: https://github.com/MajesteitBart/Strap/actions/runs/34754241737. Both CLIs finish independently even when one fails.
- Visual redesign PR 9 merged reviewed head `6501ded` as `675ec97`. All review findings were repaired or refuted with evidence before merge. Main verification passed all three jobs in https://github.com/MajesteitBart/Strap/actions/runs/34756956495. Netlify production deploy `6aa695bcbc6cda0008fdec92` published that merge on 2026-09-13 at 12:24:43 UTC. Live checks passed seven public/auth routes, API/database/auth health, OAuth discovery, and unauthenticated app-route denial.

- Delano research, Spec, plan, workstreams, decisions, and atomic tasks validate for `strap-rebrand`.
- Fable approved the plan after compatibility blockers were resolved and later passed the grounded agent-contract review.
- The latest redesign suite passes 187/187 tests, strict TypeScript and ESLint pass, and the production build succeeds with 102 generated routes.
- After integration with the release checks, the exact rebrand audit covers 1,102 tracked repository files and classifies 4,766 remaining case-insensitive Creed occurrences across 437 files and 65 Creed-named paths through 502 reviewed history or compatibility entries.
- The earlier `@bvdm/strap@0.1.1` release passed typecheck and 30 tests; the legacy CLI passed 20 compatibility tests. Its 51-file tarball was published and verified before the shared-skills release below.
- A bounded, grounded Fable release review passed with no blockers. Its three actionable non-blocking findings were resolved in the same pass.
- Cloudflare API and public DNS checks confirm `strap.bvdm.ai` resolves to `creed-bvdm.netlify.app`; HTTPS returns 200 with a valid Netlify certificate.
- Earlier production deploy `6a61edde4d776c00087bd686` from commit `1499389` verified the revised keys title and copy, `https://strap.bvdm.ai/home` canonical URL, healthy API/database/auth checks, and Strap OAuth/MCP discovery. Its Git build failure came from the root TypeScript project scanning the independent `packages/strap` CLI without its separately installed dependencies; both CLI packages are now excluded from the web app project and retain their own type-checks and tests. The release uses Next.js `16.2.11` and a Webpack production bundle because Netlify's local Windows edge packager does not trace the generated middleware runtime; the equivalent clean Linux Netlify build and edge packaging pass.
- T3 collaborative browser evidence covers the production homepage at mobile, tablet, and desktop widths plus visible keyboard focus. Network requests were clean; the browser reported only Netlify's non-blocking report-only CSP warning.
- On 2026-07-24 the operator explicitly approved T-009 despite the unavailable Computer Use native helper. The task, WS-D, plan, and Spec are closed, and `delano validate` passes with zero errors or warnings.
- The follow-up inventory is folded into `.project/projects/strap-rebrand/inventory/index.md` with 111 schema-checked resolution files. All rename-first items are implemented or retained as explicit compatibility/history. The 33 visual-design entries point to the planned redesign follow-up.
- The rename-first work is mapped into `.project/projects/strap-rename-completion/`. Its rebuilt audit reads the Git index plus current untracked rename targets, scans text without extension or case exclusions, inventories Creed-bearing paths, fingerprints each reviewed file/path classification, and asserts canonical Strap values.
- Desktop and 390px mobile browser smoke covers ten public/auth routes with zero console warnings, console errors, or page errors. The responsive mobile menu is operable. Signed-in routes correctly gate unauthenticated sessions.
- `npx supabase db reset` applies the forward Strap profile-default migration successfully while preserving legacy database compatibility.
- GitHub's contents API confirms published `main` serves the Strap clone URL and `read_strap` CLI example from the root README.

- Shared skills shipped in PR 13, reviewed head `0a48998`, merged as `ae692af`. Netlify deployment `6aa6cd1e2feef300089b0d9b` serves that merge; production HTTP and database-boundary checks pass. `@bvdm/strap@0.2.0` is published as `latest`, and a fresh registry installation passed actual two-device sync. Verification covers 212 app tests, 39 primary CLI tests, 20 legacy CLI tests, 34 pgTAP assertions, strict types, lint, build, browser acceptance, and two-model MCP onboarding. See `.project/projects/shared-skills/updates/2026-09-13-release-complete.md`.
- Billing offboarding PR 5 and runtime security PR 12 are merged and deployed. Atomic Company provisioning and both Skills migrations are applied to the intended hosted project. Effective grants on older service-only RPCs were restored to the committed migration definitions and verified without modifying user data.

## What Is Next

- Restore OpenWiki generation in draft PR 8. The maintainer funded OpenRouter on 2026-09-13; the API reports $10 in purchased credits and the production function key matches this checkout's funded key. A new workflow run can now verify the outstanding native-worker completion issue. No output from failed runs has been published. BYOK also remains available.
- Complete reopened redesign tasks T-002 and T-005: apply the committed confirmation and recovery email templates through Supabase management access and verify delivered emails in mail clients. The application UI is deployed, but the redesign contract remains open until this email gate passes.
- Continue serving the `creed.md` compatibility origin during the migration window.

## Remaining Risks

- Brand classifications are exact-file fingerprints rather than semantic proofs. Any changed Creed-bearing file or path invalidates the gate and requires renewed review.
- The old production origin must continue serving MCP/OAuth endpoints directly during the migration window.
- Dependency audits still report seven inherited advisories in the dependency graph after the Next.js patch upgrade (one low, one moderate, and five high); resolving unrelated transitive advisories was not included in this deployment fix.
- Computer Use loaded its safety and confirmation guidance, but runtime bootstrap failed because the native Windows helper pipe was unavailable. T3 Preview supplied production public-route evidence; the operator accepted the missing Computer Use authenticated-route pass as a known coverage gap when closing T-009.
