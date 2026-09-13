---
timestamp: 2026-09-13T14:42:01Z
status: in-progress
task: T-004
stream: WS-A
---

# Local verification

- App: 211 tests pass; strict TypeScript passes; lint has no errors and six pre-existing navigation warnings. Production build succeeds.
- Primary CLI: 37 tests, type-check, and package dry-run pass. Legacy CLI: 20 tests and type-check pass. Compatible transport dependency updates leave both CLI audits clean.
- Database: final npx supabase db reset --local and all 23 pgTAP tests pass on a disposable instance. SQL uses PT409 for optimistic conflicts because 40001 triggered PostgREST retries. Hosted dry-run confirms only the new migration for the intended project; it is not applied yet.
- Live runtime: Personal and Company session APIs, no-store responses, read/member/outsider denials, two concurrent publications, history, MCP access modes, profile isolation, revoked membership, and two actual CLI device directories pass against the disposable database.
- Agent onboarding: Claude Fable 5.1 and GPT-5.5 both read the profile, list shared skills, load relevant instructions/files, and create a sample proposal through the actual MCP endpoint using fictional fixtures. Empty optional file paths are handled as an instruction/manifest read, with a regression test.
- Browser: 1280 x 800 DOM inspection verifies owner empty/library, create, publication, preserved conflict drafts, and restoring version 1 as a new version 3. T3 Preview remains hidden; a native archive confirmation blocks subsequent automation. Screenshots, mobile layout, folder-import UI, and Company member browser states remain pending. API/CLI equivalents are covered separately and do not replace those GUI checks.
- Release gates still pending: remaining GUI acceptance, final-head Codex review, CI, hosted migration, production deployment, and npm 0.2.0 publication. Windows npm authentication still returns 401 despite the user's login attempt; a fresh login was opened and user input is pending. OpenWiki automation remains paused.

Private runtime logs and fixtures are stored outside the feature worktree under the maintainer checkout's ignored agent log directory. No credentials or production user data are included in these artifacts.
