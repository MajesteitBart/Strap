---
id: T-006
name: Replace session plumbing in server, proxy, and client code
status: done
workstream: WS-B
created: 2026-09-13T17:49:30Z
updated: 2026-09-13T21:47:29Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-004]
conflicts_with: []
parallel: true
priority: medium
estimate: L
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Replace session plumbing in server, proxy, and client code

## Description
Rewrite `lib/api-auth.ts`, `lib/request-auth.ts`, `proxy.ts`, `app/api/auth/signout/route.ts`, `app/auth/callback/route.ts`, the cookie fast path in `app/page.tsx`, `components/auth/*`, `components/marketing/use-landing-auth-state.ts`, `components/marketing/use-onboarding-resume.ts`, the sign-out call in `components/strap/strap-provider.tsx`, and `components/auth/reset-password-screen.tsx`. Delete `lib/supabase/`.

## Acceptance Criteria
- [x] Every `/api/app/*` route still calls `requireApiAuth()` and returns 401 without a session.
- [x] Marketing routes still skip user state through the `x-pathname` gate.
- [x] Sign-out revokes the session server-side and clears the cookie.
- [x] `onAuthStateChange` consumers use the Better Auth client session hook.

## Traceability
- Story: US-001
- Acceptance criteria: AC-001

## Technical Notes
The middleware no longer refreshes tokens. Keep only the request id and `x-pathname` headers, plus an optional cookie presence check for app routes. Replace `isSupabaseConfigured()` with a database configuration check for the local no-backend mode.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-09-13T21:47:29Z: Local implementation verified: 283 tests, browser/API/MCP and import rehearsals; see updates/2026-09-13-local-runtime-verified.md.
- 2026-09-13: Planned from the Supabase surface inventory.

- 2026-09-13: Local implementation and checks verified; see updates/2026-09-13-local-runtime-verified.md. External provider/production checks are retained in T-016/T-017.
