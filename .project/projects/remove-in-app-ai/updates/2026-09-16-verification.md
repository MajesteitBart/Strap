# Local implementation verified

Remote main was fetched, the existing two-file metadata merge was resolved while preserving the local skills commit, and the merge completed as `56e550a`. `git pull --ff-only origin main` then reported up to date. Implementation is on `feature/remove-in-app-ai`; no deployment or push was performed.

Removed the in-app assistant, Ask and model-backed search, quality generation and scoring controls, editor Tab completion, AI settings/usage, Company BYOK endpoint, provider callers and model environment examples. Local fuzzy search, navigation and manual editing remain. Updated onboarding checklist, welcome tour, docs, pricing, and repository guidance. The old autocomplete article URL explains the external-agent workflow.

OAuth/MCP, section permissions and proposal review remain intact. Historical quality-report reads retain their MCP tool names and validation in `lib/quality-report.ts`; there is no provider execution path. Database schemas and stored records are unchanged. Existing model credentials are unused, not revoked or deleted.

## Verification

- `npm test`: 178 tests, 170 passed, 8 database integration tests skipped without the opt-in environment, zero failures. Retired feature tests were removed; new regression guards reject model calls and retired API consumers.
- `npx tsc --noEmit -p .`: passed after refreshing generated Next.js route types.
- `npm run lint`: zero errors; six pre-existing internal-navigation warnings.
- `npm run build`: passed, 94 generated pages. Existing Edge Runtime and Node module-registration deprecation warnings remain.
- `npm run audit:brand`: passed after reviewing retained compatibility identifiers and removing the retired agent-model variable assertion.
- `delano validate`: zero errors and warnings.
- `node scripts/verify-local-runtime.mjs http://localhost:3010`: passed against local Postgres, including session authentication, MCP scoped keys, device OAuth, Company permissions, stale revision rejection, proposal acceptance, and Vault boundaries. Fixtures were removed by the script.
- Playwright at 1440px and 390px: Personal editor, local search/Enter, empty search/Escape, Personal settings, Company settings, external MCP proposal creation, approval and rejection persisted across reload. No retired AI requests or uncaught browser exceptions in the observed flows.
- The browser used an isolated synthetic local account, removed after verification. [Mobile editor screenshot](../mobile-editor.png) shows the accepted external-agent change.

## Scope limits

No hosted database, provider key, deployment, external tracker, or production setting was changed. Generated OpenWiki pages remain untouched and can be regenerated from updated source documentation. No new dependency was added.
