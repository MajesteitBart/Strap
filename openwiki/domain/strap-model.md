# Strap domain model and workflows

## Product model

A **Strap** is a compact canonical context profile read by AI agents before work. It contains ordered sections, governed proposals, and activity/history. Agents should tighten, merge, update, and prune durable facts rather than append every observation.

Two product modes share this model:

- **Personal Strap:** one owner and single-writer-optimized persistence.
- **Company Strap:** owner/admin/member roles, shared sections, per-member controls, concurrency checks, and collaboration.

Open, Personal, and Company are currently free. Active runtime access is not gated by Stripe or a paid entitlement.

The primary shared types and transformations are in `lib/strap-data.ts`; Personal mapping is in `lib/strap-backend.ts`, and Company writes are in `lib/company-sections.ts`. The old `lib/creed-*` paths are deprecated compatibility re-export shims; Creed-named database identifiers remain compatibility contracts.

## Sections and permissions

A section has a stable ID, display name, position, accent, normalized Tiptap HTML, revision, attribution, archive state, and agent permission. `lib/rich-text.ts` owns normalization and Markdown conversion.

Personal onboarding centers on Identity, Goals, Work, Preferences, and Routines. Company onboarding seeds Company, Ethos, Operating Rules, People, Projects, Clients, Tools, and Agent Rules. Archived or hidden sections are not exposed to agents; imported GitHub sections default to proposal permission.

The permission lattice is:

```text
hidden < read-only < propose < direct
```

`lib/strap-permissions.ts` is the TypeScript policy source used by payload builders, mutation guards, and UI; `lib/creed-permissions.ts` is only a deprecated compatibility re-export shim. SQL helpers/RLS must remain equivalent.

- Company owner/admin human access resolves to direct.
- A member uses the per-section override, defaulting to direct when absent.
- Agent access is the minimum of member section permission, the member's agent ceiling, and the credential's grant mode.
- A credential mode can only narrow access; it cannot grant visibility or mutation absent from live policy.
- Owner/admin manage members and section lifecycle; owner-only operations include Company BYOK, ownership transfer, and deletion.

## Proposals, direct edits, and history

A proposal can update rich text or request create, delete, rename, recolor, or reorder. It carries attribution, reason/impact/confidence metadata, status, and usually a base revision.

For Company review:

- owner/admin can review visible proposals;
- members can review only where they have direct access;
- authors may withdraw but authorship does not confer approval;
- new-section proposals require owner/admin review;
- stale base revisions cannot overwrite newer content.

Direct Company edits also require `baseRevision`. Successful mutations record activity and a section version; restore creates a new revision instead of erasing history. Personal proposal handling is more client-oriented, and some structural outcomes rely on the next full-state persistence cycle. Do not interchange these paths.

## Onboarding

### Personal

1. The user answers a short questionnaire.
2. `lib/onboarding/compile.ts` creates a deterministic five-section skeleton.
3. The product provides a composition prompt for an external assistant.
4. Returned Markdown is previewed, parsed, and claimed as the initial Personal Strap.
5. Completion enters the hosted app; there is no paid-plan gate.

### Company

1. `POST /api/app/company` idempotently creates or resumes the owner's one Company shell and owner membership, then makes it active.
2. The owner answers organization questions.
3. `lib/onboarding/compile-company.ts` prepares eight sections and a composition prompt.
4. Pasted Markdown maps to sections by heading.
5. Completion activates the Company Strap and clears resume state; invites follow and are not paid-seat purchases.

The app layout scans all owned Company records for unfinished setup so a stale Personal active cookie cannot hide a resume.

## Collaboration and profile files

Company editing combines server-authoritative writes with realtime and bounded polling. Local pending sections, proposal suppression, and short mutation-freeze windows prevent older fetches from overwriting optimistic changes.

GitHub serialization defaults new integrations to `strap.md`, uses `##` as section boundaries, shifts nested headings for export, reverses the shift on import, and preserves accent in `<!-- creed:accent=... -->`. That comment is a retained format identifier. The round trip is designed for supported editor markup, not arbitrary byte preservation.

`lib/profile-file.ts` defines path behavior:

- absent/blank or configured `strap.md`: read `strap.md`, then `creed.md` fallback;
- any other explicit path, including `creed.md`: read only that path;
- push refuses to create `strap.md` beside a fallback-resolved `creed.md` without explicit migration.

Personal has pull preview/apply. Company currently supports push only.

## Source paths and change checks

- Domain types/agent contract: `lib/strap-data.ts`
- Permission rules: `lib/strap-permissions.ts`
- Personal persistence: `lib/strap-backend.ts`
- Company writes/versioning: `lib/company-sections.ts`
- Membership/context: `lib/strap-membership.ts`, `lib/strap-context.ts`
- Markdown/profile paths: `lib/strap-markdown.ts`, `lib/rich-text.ts`, `lib/profile-file.ts`
- State validation: `lib/validation/strap-state.ts`
- UI orchestration: `components/strap/strap-provider.tsx`, `components/strap/strap-switcher.tsx`, `components/strap/file-screen.tsx`

Verify Personal and Company separately; human and agent outcomes; hidden/read/propose/direct modes; stale revisions/history; TypeScript and SQL policy twins; and profile round trips/fallback conflicts. Representative tests include `company-permissions`, `company-onboarding`, `company-proposal-drafts`, `editing-system`, `rich-text-equivalence`, `github-roundtrip`, `profile-file`, and Strap compatibility/brand suites.
