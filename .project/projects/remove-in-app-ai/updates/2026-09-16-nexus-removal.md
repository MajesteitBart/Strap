# Nexus removal verified

The user requested removal of Nexus as a follow-up to the in-app AI removal. The file screen now renders the section editor directly, without desktop or mobile view toggles. Removed the Nexus component, graph compiler, and four tests for the retired graph. Documentation now describes section references without advertising visualization. The existing documentation anchor remains compatible.

Section-reference chips, editing, reordering and proposal review remain in the existing editor path.

Verification: 174 tests (166 passed, 8 opt-in database tests skipped), strict TypeScript, production build, and lint with zero errors and the same six pre-existing warnings. Playwright verified the signed-in editor at 1440px and 390px, with no Nexus/Tabula button or canvas. Screenshots: `editor-1440.png` and `editor-390.png`. The synthetic local account was removed after verification.

Changes remain local on `feature/remove-in-app-ai`; no push or deployment.
