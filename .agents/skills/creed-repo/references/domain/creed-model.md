# Creed domain model and workflows

## Product model

A **Creed** is a canonical context profile read by AI agents before work. It contains ordered **sections**, accepts governed **proposals**, and records **activity**. Its quality comes from curation: agents should tighten, merge, update, and prune rather than append every observed fact.

Two Creed types share this model:

- **Personal**: one owner, personal entitlement, single-writer optimized persistence.
- **Company**: owner/admin/member roles, shared sections, pooled AI/billing resources, per-member controls, concurrency checks, and collaboration.

The primary shared types and transformation rules are in `lib/creed-data.ts`. Database mapping is split between `lib/creed-backend.ts` and `lib/company-sections.ts`.

## Sections

A section has a stable ID, display name, position, accent, rich-text content, revision, attribution, archive state, and agent permission. Rich text is stored as normalized HTML for the Tiptap editor. `lib/rich-text.ts` handles normalization and Markdown conversion.

Personal onboarding centers on five default sections: Identity, Goals, Work, Preferences, and Routines. Additional profile categories include Beliefs, Constraints, People, Health, and Context. Company onboarding instead seeds Company, Ethos, Operating Rules, People, Projects, Clients, Tools, and Agent Rules.

Archived or hidden sections are not exposed to agents. Imported GitHub sections default to proposal permission rather than unrestricted direct editing.

## Permissions

The shared section lattice is:

```text
hidden < read-only < propose < direct
```

`lib/creed-permissions.ts` is the TypeScript policy source used by payload builders, write guards, and UI controls. SQL helpers and RLS encode equivalent rules and must change in lockstep.

- Owner/admin human access resolves to `direct` for all company sections.
- A member uses a per-section override, defaulting to `direct` when absent.
- An agent receives the weaker of the member’s effective section permission and the member’s own agent ceiling.
- Owner/admin can manage members and section lifecycle.
- Only the owner manages billing, seats, BYOK, ownership transfer, or deletion.

Company billing adds another gate:

- `active`: normal operation.
- `past_due`: still writable during Stripe retry/grace handling.
- `frozen`: retained but read-only; content changes, proposals, invites, and AI writes are blocked.

## Proposals and review

A proposal is either a rich-text update or a structural operation such as create, delete, rename, recolor, or reorder. It carries author/agent attribution, reason/impact/confidence metadata, status, and usually a base revision.

For company review:

- Owner/admin can review visible proposals.
- Members can review proposals only where they have direct section access.
- Human authors may withdraw their proposal but authorship does not confer approval power.
- New-section proposals require owner/admin review.
- Accepting a rich-text proposal checks the base revision; a proposal based on old content becomes stale instead of overwriting newer work.

Direct company edits also require `baseRevision`. Successful mutations record activity and a section version; restore creates a new revision instead of erasing history. The server retains up to 200 versions per section, while the UI requests a smaller recent window.

Personal proposal handling is more client-oriented. The server makes proposal resolution durable, while the provider applies some structural results through the next full-state persistence cycle. Do not assume the company transaction path and Personal review path are interchangeable.

## Onboarding

### Personal

1. The user answers a short questionnaire.
2. Deterministic compilation creates a five-section skeleton (`lib/onboarding/compile.ts`).
3. The product gives the user a composition prompt for an external assistant.
4. Returned Markdown is previewed, parsed, and claimed as the initial Creed.
5. Paid access gates the hosted app, while the composition flow itself can precede app entry.

### Company

1. Stripe purchase provisions a company shell, owner membership, billing record, pooled credits, and an onboarding stage.
2. The owner answers organization questions.
3. `lib/onboarding/compile-company.ts` prepares eight company sections and a composition prompt.
4. Pasted Markdown is mapped to those sections by heading name.
5. Completion activates the Creed and clears the resume stage; invites are handled at the end and consume seat capacity while pending.

The app layout scans all owned Company Creeds for unfinished setup so a stale Personal active-cookie cannot hide a company onboarding resume.

## Collaboration and synchronization

Company editing combines server-authoritative operations with realtime and polling. The client preserves locally pending sections, suppresses proposals it just resolved, and uses short mutation freeze windows to avoid overwriting optimistic changes with an older fetch. These mechanisms are race controls, not incidental complexity.

GitHub serialization uses `##` for section boundaries, shifts section-local headings down for export, reverses that shift on import, and preserves accent in `<!-- creed:accent=... -->`. It avoids template guessing because earlier inference reformatted legitimate freeform content. The round trip is designed for supported editor markup, but whitespace and unsupported HTML may normalize.

## Important source paths

- Types and agent contract: `lib/creed-data.ts`
- Permission rules: `lib/creed-permissions.ts`
- Personal persistence: `lib/creed-backend.ts`
- Company writes/versioning: `lib/company-sections.ts`
- Membership/context: `lib/creed-membership.ts`, `lib/creed-context.ts`
- Markdown/rich text: `lib/creed-markdown.ts`, `lib/rich-text.ts`
- Product orchestration: `components/creed/creed-provider.tsx`, `file-screen.tsx`
- Review/history UI: `inline-proposal-diff.tsx`, `review-pill.tsx`, `section-history-sheet.tsx`
- Onboarding: `components/creed/onboarding-screen.tsx`, `company-onboarding-screen.tsx`, `lib/onboarding/`

## Change checklist

When changing this model, verify:

1. Personal and Company paths separately.
2. Human and agent permission outcomes, including hidden sections.
3. Direct and proposal modes, structural and content changes.
4. Base-revision conflict behavior and version history.
5. TypeScript and SQL/RLS policy twins.
6. Markdown round-trip tests when editor or serialization formats change.
7. Billing-frozen behavior for every write path.

Focused tests include `company-permissions.test.ts`, `company-onboarding.test.ts`, `company-proposal-drafts.test.ts`, `editing-system.test.ts`, `rich-text-equivalence.test.ts`, `section-suggestions.test.ts`, and `github-roundtrip.test.ts`.
