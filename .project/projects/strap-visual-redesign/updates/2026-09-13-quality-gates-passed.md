---
timestamp: 2026-09-13T10:29:51Z
status: done
task: T-005
stream: WS-D
---

# Progress Update

## Completed
- Gates: tsc, lint, 184 tests, production build, brand audit (allowlist renewed for line-shifted fingerprints with unchanged occurrence counts), delano validate clean for this project. Headless Chrome evidence over the DevTools protocol in the main checkout .agents/logs/redesign-shots/ directory: 53 captures across desktop, mobile, keyboard focus, reduced motion, signed-in Personal, dark mode, and Company mode; no stalled boundaries, overflow, or console errors beyond the 404 document. Contrast measured: soft text 5.38:1 on paper and 4.92:1 on surface-2. Not exercised: the first-run welcome tour, mail-client rendering of emails, and real OAuth provider sign-in.

- Coordinator integration checked empty persisted Personal File, Connections and Settings against disposable local Supabase. Removed section-count redirects while retaining the persisted-profile layout gate, corrected the empty File message, and confirmed the add-section affordance. Company member Settings renders read-only controls without owner danger actions; an outsider receives 403 when attempting Company activation and stays in their Personal Strap. An owner with unfinished Company setup resumes the 15-step onboarding screen. These were DOM/runtime checks in the hidden T3 Preview, with queued streaming boundaries flushed for inspection; they do not add screenshot evidence.
- Pricing label colours now use accessible text tones and dark text on bright green/yellow chips. Browser computed styles confirm the intended colours. The historical bootstrap updates placeholder is included so complete Delano validation succeeds.

- PR 9 review found low-contrast white labels on the bright dark-mode status palette. Solid success/danger actions now use dedicated deep fill and hover tokens, while text-only statuses retain their dark-mode colours. A contrast regression measures white-label contrast in both themes; 185 tests, TypeScript, lint and production build pass.

- The second PR review found white labels on bright resource kickers. Skills and Environments badges, matching homepage chips, and the orange assembly marker now use dark ink. Public error and secondary card/map text use readable text tones. A second contrast regression checks all public resource kicker/chip pairs; all 186 tests, types, lint, build and brand gates pass.

## In Progress
- Hosted email application and rendering remain open under T-002 and T-005; both tasks are blocked on management access and their parent delivery lifecycle is reopened. No email gate is waived. The application portion shipped in PR 9: reviewed head 6501ded merged as 675ec97, all three main checks passed in run 34756956495, and Netlify deploy 6aa695bcbc6cda0008fdec92 published at 12:24:43 UTC. Live public/auth routes, API/database/auth health, discovery and unauthenticated app-route denial passed.

## Blockers
- Hosted Supabase confirmation/recovery template application still requires management access; the committed templates and application-served Company invitation email are separate surfaces. Mail-client rendering was not exercised.

## Next Actions
-

- Public reduced-motion handling now includes every transitioning selector, including navigation, index rows, FAQ triggers and password visibility controls. All 186 tests, TypeScript, lint, build and brand audit pass after the change.

- The info toast now uses primary text on its context tint, keeping its Refresh action readable at 70 percent opacity. Context links and badges use the text palette, and blue button hover fills support white labels. Regression checks cover all toast tones in both themes, the actual Refresh opacity, context text, and solid action fills. The full suite passes 187 tests.
- Later review repairs cover mobile-menu breakpoint visibility, every copy-animation frame, unfinished Company setup badges, permission icons, and light consent icons and portaled menus under a saved dark theme. Browser computed-style probes confirm the public menu palette remains light without full-page dimensions.
- The final nested-landmark finding was refuted: the production /file loader tree and installed Next sources place the root error boundary above the signed-in layout, replacing its main element. Automatic approval review blocked a supplementary local test-server launch, so no runtime error-boundary pass is claimed. The temporary probe route was removed and the production build rerun successfully.
