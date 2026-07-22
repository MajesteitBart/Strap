# Project Style Guide

## Naming
- Use kebab-case Delano project slugs, stable `WS-A` workstream identifiers, and sequential `T-001` task identifiers.
- Match existing TypeScript and route naming. Preserve legacy domain identifiers unless a scoped migration explicitly removes them.

## Documentation Conventions
- Avoid hard-wrapping Markdown prose added to Delano artifacts.
- Use ISO 8601 UTC timestamps in contract frontmatter and dated evidence.
- Refer to Personal Creed and Company Creed explicitly when behavior differs.
- No em dashes in product copy. Documentation may quote established source wording but should prefer plain punctuation.
- Update context only for durable facts; use task evidence and updates for transient execution detail.

## Review Expectations
- Read the complete local flow around changed code, including callers, persistence, authorization, and tests.
- Verify Personal and Company behavior, human and agent permission paths, hidden-section filtering, and billing/frozen-state effects wherever they intersect.
- Run focused checks plus `npx tsc --noEmit -p .`, `npm run lint`, and `npm run build` before claiming application changes complete.
- Migration changes also require `npx supabase db reset`; agent-contract changes require a sample read and proposal across at least two models.
