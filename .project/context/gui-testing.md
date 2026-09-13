# GUI Testing Policy

## Enforcement Mode
- Required for user-facing UI, navigation, interaction, responsive layout, animation, onboarding, auth, and browser-visible regression work. Advisory for documentation-only and delivery-runtime changes.

## Smoke Routes
- Public: `/home`, `/docs`, `/pricing`, `/company`, `/examples`, `/roadmap`, `/learn`, `/bench`, `/changelog`, `/privacy`, `/terms`, and `/stack` without user-state loading, plus the 404 and route error states.
- Authenticated: `/file`, `/connections`, and `/settings` in relevant Personal and Company states.
- Skills: `/skills` in Personal owner, Company admin, and Company member states. Exercise create/import, draft conflicts, publication, archive, history restore, supporting files, profile switching, and device setup. Native confirmation dialogs need a visible Preview panel; do not trigger one while the panel is hidden.
- First-run and auth: `/onboarding`, OAuth authorization/callback, and MCP connection flows when touched.

## Console Filtering
- New uncaught exceptions, hydration errors, failed application requests, React warnings caused by the change, and authorization leaks are blocking.
- Known third-party noise may be recorded and filtered only when its source and non-impact are verified.

## Preview Environment Notes
- The T3 collaborative preview can run navigation and DOM evaluation while its panel is hidden, but screenshots, viewport resize, real clicks, and keyboard presses fail in that state. Responsive checks can run inside a same-origin iframe sized to the target width, which honours media queries.
- In an unpainted preview window `requestAnimationFrame` never fires, so React 19.2 keeps streamed Suspense boundaries queued (routes with `loading.tsx` stay on their skeleton). Calling `window.$RV(window.$RB)` in the page reveals them for inspection; painted browsers do not need this.

## Evidence Requirements
- Record routes, states, viewport sizes, interactions exercised, and console/network outcome in the relevant task evidence.
- Capture screenshots or recordings when visual fidelity, animation, responsive behavior, or a GUI regression is part of acceptance.

## Design Validation Threshold
- Preserve the established visual language, accessible focus and reduced-motion behavior, interruptible motion, responsive layouts, and product copy rules.
- A UI change is incomplete when it only renders; its empty, loading, error, permission, and Company/Personal states must remain coherent where applicable.
