---
id: WS-B
name: WS-B Authentication
owner: MajesteitBart
status: done
created: 2026-09-13T17:49:11Z
updated: 2026-09-13T21:47:29Z
operating_mode: multi-stream
---

# Workstream: WS-B Authentication

## Objective
Better Auth replaces Supabase Auth for browser sessions, sign-in methods, verification and reset emails, user profile data, and account lifecycle.

## Owned Files/Areas
`lib/auth/`, `app/api/auth/`, `proxy.ts`, `lib/api-auth.ts`, `lib/request-auth.ts`, `lib/user-name.ts`, `components/auth/`, `components/marketing/use-landing-auth-state.ts`, `components/marketing/use-onboarding-resume.ts`, `lib/email-templates/`, and the user columns in the schema.

## Dependencies
T-002 for the schema. Google and X OAuth app access for callback registration. Resend credentials.

## Risks
Bcrypt hash migration. Provider callback registration. The `sb-*` cookie fast path in `app/page.tsx`. GitHub identity linking that shared the old callback route.

## Handoff Criteria
The probe report in T-004 is recorded. Both sign-in methods work for a migrated user. Every `/api/app/*` route still calls `requireApiAuth()`. Marketing routes still skip user state.
