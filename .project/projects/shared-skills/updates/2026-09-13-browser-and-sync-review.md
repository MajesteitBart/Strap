---
timestamp: 2026-09-13T15:19:00Z
status: in-progress
task: T-004
stream: WS-A
---

# Browser acceptance and sync review repair

- After the user approved a separate browser, Playwright CLI with installed Chrome verified the actual HTTPS development page at desktop 1440 x 900 and mobile 375 x 812. Personal owner and empty states, Company owner/member states, and switching between profile libraries passed. The mobile editor fits without horizontal page overflow.
- Native browser interactions passed: create and publish, supporting script creation and executable flag, folder import with binary assets, downloaded JSON import, file removal, archive cancellation and confirmation, restore, and earlier-version restoration as a new revision. Downloaded bytes and executable metadata were checked independently. Cancelling link navigation or a profile switch preserves the unsaved draft.
- Device setup selects Claude or Codex and global or project scope; clipboard output matches the displayed command. Company members have read-only editors and no import, publish, archive, or file-edit controls. Existing live tests separately cover direct/read/proposal MCP grants and revoked membership.
- Fixed the Skills navigation icon passing `initialState` to the DOM. The browser now has no React or application errors. Disposable-fixture warnings after restarting with a different encryption key and report-only CSP notices for local Supabase Realtime are understood test-environment noise.
- Fixed remote development hydration by allowing explicitly configured `STRAP_DEV_ORIGINS`; the test hostname is kept in private environment configuration. The HTTPS login bridge and Skills page now work through Tailscale with real interactions.
- Codex review 5191102886 completed on b3c058b and identified an empty-library directory binding gap (comment 3999962512). Sync now saves the profile/server binding after successful preflight even when no skills are selected. A regression verifies that another profile or server is then refused, while dry-run creates no directory. Primary CLI suite: 38 passing tests. App types, lint (six existing warnings), and production build pass after these repairs.
- Screenshots, downloaded bundles, and browser scripts are private test artifacts under ignored directories. No production user data was created. Final-head review, CI, npm authentication/publication, merge, and production verification remain release gates.
