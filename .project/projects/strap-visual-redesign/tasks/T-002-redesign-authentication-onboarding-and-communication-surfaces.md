---
id: T-002
name: Redesign authentication onboarding and communication surfaces
status: done
workstream: WS-B
created: 2026-07-24T21:18:46Z
updated: 2026-09-13T10:29:12Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: []
conflicts_with: [components/auth, app/authorize, app/device, app/invite, app/onboarding, supabase/email-templates]
parallel: true
priority: high
estimate: L
operating_mode: multi-stream
story_id: 
acceptance_criteria_ids: []
---

# Task: Redesign authentication onboarding and communication surfaces

## Description

Apply the approved Strap visual language to authentication, setup, OAuth consent, device authorization, invitations, onboarding, and transactional emails.

## Acceptance Criteria

- [x] Authentication and communication surfaces share the approved Strap visual hierarchy and accessibility behavior.

## Traceability
- Story: none
- Acceptance criteria: none

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-09-13T10:29:12Z: Commit 49accf2: auth shell and labelled fields, sign-in, sign-up, reset, backend setup, OAuth consent, device authorization, invite, and three email templates on the worktable system with template variables and placeholder copy intact. Sign-in with the hosted test user succeeded through the redesigned form; login, signup, reset, device, invalid authorize, and invalid invite captured at 1440 and 390.

- 2026-09-13T09:56:18Z: Approved worktable direction; auth, consent, device, invite, and email surfaces.
- 2026-07-24T21:18:46Z: Created from .project/templates/task.md by `delano task add`.

- 2026-09-13: Coordinator reviewed the implementation and browser evidence, completed local role/empty-profile checks, and verified all local quality gates. Acceptance checkboxes reconciled with this evidence. External PR review and merge are the remaining release gates.
