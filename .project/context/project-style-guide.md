# Project Style Guide

## Naming
- Use kebab-case Delano project slugs, stable `WS-A` workstream identifiers, and sequential `T-001` task identifiers.
- Match existing TypeScript and route naming. Preserve legacy domain identifiers unless a scoped migration explicitly removes them.

## Documentation Conventions
- Avoid hard-wrapping Markdown prose added to Delano artifacts.
- Use ISO 8601 UTC timestamps in contract frontmatter and dated evidence.
- Refer to Personal Strap and Company Strap explicitly in customer-visible copy when behavior differs. Internal Creed type, route, schema, event, storage, CSS-token, and tool identifiers remain stable compatibility names.
- No em dashes in product copy. Documentation may quote established source wording but should prefer plain punctuation.
- Update context only for durable facts; use task evidence and updates for transient execution detail.

## Strap Visual Language
- The worktable system approved on `/home` and `/docs` now applies to every surface: public pages, authentication, OAuth consent, device authorization, invitations, transactional email, and the signed-in Personal and Company product.
- Use a warm paper background, flat white surfaces, crisp one-pixel dark frames, near-square geometry (2 to 6px radii), Bricolage Grotesque display headings, Inter body text, and JetBrains Mono operational labels.
- Keep the resource colour mapping stable: Context blue, Skills orange, Keys purple, Environments green, and Agents yellow. Status colours derive from the same palette: success from Environments, caution from Agents, danger from the warning red, information from Context.
- Tokens live at the root of `app/globals.css` with a warm dark twin under `.dark`; the public site stays light-only by re-asserting its palette under `.strap-site`. Portaled public controls use `.strap-public-theme` to inherit that palette without full-page geometry. Use `--strap-frame` for primary container lines, deep `--strap-*-fill` tokens behind white labels, and text-oriented status tokens for foregrounds.
- Public pages compose `components/marketing/strap-site-shell.tsx` (navigation with mobile menu, column footer, server-safe header, page hero) and the primitives in `app/strap-public.css` (cells, cards, tables, prose, FAQ, timeline, plans, forms, auth, consent, empty states). Consent-style pages use `components/strap/consent-shell.tsx`.
- Keep interaction feedback fast and restrained. Prefer colour, opacity, and small press transforms, keep every transition inside a `prefers-reduced-motion` guard, and avoid decorative motion in frequently used navigation.

## Review Expectations
- Read the complete local flow around changed code, including callers, persistence, authorization, and tests.
- Verify Personal and Company behavior, human and agent permission paths, hidden-section filtering, and billing/frozen-state effects wherever they intersect.
- Run focused checks plus `npx tsc --noEmit -p .`, `npm run lint`, and `npm run build` before claiming application changes complete.
- Migration changes also require `npx supabase db reset`; agent-contract changes require a sample read and proposal across at least two models.
