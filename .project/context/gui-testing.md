# GUI Testing Policy

## Enforcement Mode
- Required for user-facing UI, navigation, interaction, responsive layout, animation, onboarding, auth, and browser-visible regression work. Advisory for documentation-only and delivery-runtime changes.

## Smoke Routes
- Public: `/home`, `/docs`, `/pricing`, `/privacy`, `/terms`, and `/stack` without user-state loading.
- Authenticated: `/file`, `/connections`, and `/settings` in relevant Personal and Company states.
- First-run and auth: `/onboarding`, OAuth authorization/callback, and MCP connection flows when touched.

## Console Filtering
- New uncaught exceptions, hydration errors, failed application requests, React warnings caused by the change, and authorization leaks are blocking.
- Known third-party noise may be recorded and filtered only when its source and non-impact are verified.

## Evidence Requirements
- Record routes, states, viewport sizes, interactions exercised, and console/network outcome in the relevant task evidence.
- Capture screenshots or recordings when visual fidelity, animation, responsive behavior, or a GUI regression is part of acceptance.

## Design Validation Threshold
- Preserve the established visual language, accessible focus and reduced-motion behavior, interruptible motion, responsive layouts, and product copy rules.
- A UI change is incomplete when it only renders; its empty, loading, error, permission, and Company/Personal states must remain coherent where applicable.
