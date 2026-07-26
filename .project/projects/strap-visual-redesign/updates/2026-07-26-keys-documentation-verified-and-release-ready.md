---
timestamp: 2026-07-26T08:09:50Z
status: done
task: T-007
stream: WS-A
---

# Progress Update

## Completed
- Added and verified a dedicated Keys chapter covering scoped agent access keys and the external credential Vault from shipped implementation truth.
- Distinguished the one-time-visible `strap_key_` bearer flow from external credentials stored in Vault.
- Documented access modes, expiry, revocation, live permission checks, Vault reveal, rotation, deletion, and Personal and Company access.
- Added a regression test that locks the public documentation to the shipped security boundaries.

## In Progress
-

## Blockers
- None

## Next Actions
- Leave the rest of the public-site redesign in the existing T-001 scope.

## Quality Evidence

### Scope

`components/marketing/docs-page-view.tsx`, its Keys and Vault regression coverage, and the exact rebrand audit classifications affected by the changed line fingerprints.

### Risk Level

Medium. The change is public documentation and presentation, but incorrect guidance could expose credentials or imply access that the product does not grant.

### Tests Run

- Unit and integration: `npm test`, 181 passed.
- Static: `npx tsc --noEmit -p .`, `npm run lint`, and `npm run audit:brand`.
- Production: `npm run build`, including static generation of `/docs`.
- Delivery: `delano validate`.
- GUI: T3 Preview at a desktop freeform viewport and the Pixel 7 preset. Verified the Keys accordion, guide links, purple Strap tone, card grids, and zero horizontal overflow.

### Results

All required checks passed. The brand allowlist refresh changed only the fingerprints for the same reviewed compatibility occurrences in the docs and security regression test.

### Defects Found

None.

### Quality Gate Decision

Pass. All acceptance criteria have implementation, test, and responsive browser evidence, with no unresolved critical defects.

## Outcome Review

### Target Outcome

Document the already-shipped Keys functionality accurately and make it feel native to the redesigned Strap docs.

### Actual Outcome

The docs now have a dedicated purple Keys chapter with three guides: choosing the right key system, connecting a headless agent, and managing external credentials in Vault. The copy is grounded in current routes, UI, permission checks, audit behavior, and plaintext boundaries.

### Delta

No unresolved delta remains inside T-007. Device authorization remains documented as an agent connection option rather than being conflated with the Keys chapter.

### Root Causes

The product shipped scoped agent access keys and Vault management before the public docs had enough detail to distinguish their separate authorization and secret-storage responsibilities.

### Follow-up Actions

- Continue the broader public-route redesign under T-001.
- No rule, skill, schema, or fixture learning proposal is needed from this slice.
