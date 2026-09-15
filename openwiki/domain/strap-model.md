---
type: "Reference"
title: "Strap domain model and workflows"
description: "Personal and Company Strap resource model: sections, the permission lattice, proposals and direct edits, onboarding, collaboration, profile-file round trips, and the shared skills library neighbor."
tags: ["strap", "domain-model", "permissions", "proposals", "onboarding", "company", "personal", "skills"]
relatedPages:
  - /openwiki/architecture/overview.md
  - /openwiki/data/schema-and-security.md
  - /openwiki/domain/skills-system.md
  - /openwiki/integrations/agents-and-oauth.md
  - /openwiki/quickstart.md
verified:
  - by: openwiki/0.5.2
    at: 2026-09-15T08:01:45.050Z
sources:
  - id: openwiki-source-2e2a2a6576fc71e58ed9eda4
    resource: repo://app/(strap-app)/layout.tsx
  - id: openwiki-source-01bc8e5c8935088be74dcd29
    resource: repo://app/api/app/company/route.ts
  - id: openwiki-source-3c2cc6be923e1ebc861cea29
    resource: repo://app/api/app/github/pull/apply/route.ts
  - id: openwiki-source-06741947290ecca669fc6f0e
    resource: repo://app/api/app/github/push/route.ts
  - id: openwiki-source-a9c44ad2ed5ebf62d6e08942
    resource: repo://app/api/app/state/route.ts
  - id: openwiki-source-dc4444e51afac6303a16114f
    resource: repo://lib/company-provision.ts
  - id: openwiki-source-1e94fa74ff14be16f479cd30
    resource: repo://lib/company-sections.ts
  - id: openwiki-source-9be6a2200819d4befc53b871
    resource: repo://lib/creed-backend.ts
  - id: openwiki-source-ff797c9b120f9be2de3fe981
    resource: repo://lib/creed-data.ts
  - id: openwiki-source-2feb868ebdc3553719d4cabc
    resource: repo://lib/creed-membership.ts
  - id: openwiki-source-0d5c5786bed6bcb9a3ed2fd2
    resource: repo://lib/creed-permissions.ts
  - id: openwiki-source-6ba98b51c788128cbea8d943
    resource: repo://lib/onboarding/compile-company.ts
  - id: openwiki-source-209495a452f0cb2e07230879
    resource: repo://lib/onboarding/compile.ts
  - id: openwiki-source-8e25abfc07a96138e8098ebd
    resource: repo://lib/profile-file.ts
  - id: openwiki-source-ec0cc0403a8bc32670067aac
    resource: repo://lib/skill-tools.ts
  - id: openwiki-source-8d6d4022b7bc27f2adc20d95
    resource: repo://lib/skills.ts
  - id: openwiki-source-9497e1ee3601a37a15b7439d
    resource: repo://lib/strap-data.ts
  - id: openwiki-source-c27e0d898c08c1f56f8090b0
    resource: repo://lib/strap-markdown.ts
  - id: openwiki-source-7a6a6637d8a5b494d8243cfb
    resource: repo://lib/strap-permissions.ts
generated: { by: "openwiki/0.5.2", at: "2026-09-15T08:01:45.050Z" }
---

# Strap domain model and workflows

## Product model

A **Strap** is a compact canonical context profile read by AI agents before work. It contains ordered sections, governed proposals, and activity/history. Agents should tighten, merge, update, and prune durable facts rather than append every observation.

Two product modes share this model:

- **Personal Strap:** one owner and single-writer-optimized persistence.
- **Company Strap:** owner/admin/member roles, shared sections, per-member controls, concurrency checks, and collaboration.

Open, Personal, and Company are currently free. Active runtime access is not gated by Stripe or a paid entitlement.

The primary shared types and transformations are in `lib/strap-data.ts`; Personal mapping is in `lib/strap-backend.ts`, and Company writes are in `lib/company-sections.ts`. The old `lib/creed-*` paths are deprecated compatibility re-export shims; Creed-named database identifiers remain compatibility contracts.

### Resource-model neighbors

A Strap owns three distinct resource kinds, kept deliberately separate:

- **Context sections** — the ordered, permissioned rich-text sections below.
- **Vault secrets** — server-side encrypted values revealed only through explicit, permission-aware flows; never exposed as section content.
- **Shared workflow skills** — a per-profile library of versioned `SKILL.md` bundles.

Beyond context (sections) and secrets, each Personal or Company Strap owns a shared workflow skill library. Skill publishing is owner/admin + direct-connection only and is intentionally separate from section editing and the proposal lifecycle: there is no path from a skill into section content or the review queue, and no path from a section edit into a skill. See [domain/skills-system.md](/openwiki/domain/skills-system.md) for the storage, versioning, agent surfaces, and device-sync details; this page does not duplicate that depth.

## Sections and permissions

A section has a stable ID, display name, position, accent, normalized Tiptap HTML, revision, attribution, archive state, and agent permission. `lib/rich-text.ts` owns normalization and Markdown conversion.

Personal onboarding centers on Identity, Goals, Work, Preferences, and Routines. Company onboarding seeds Company, Ethos, Operating Rules, People, Projects, Clients, Tools, and Agent Rules. Archived or hidden sections are not exposed to agents; imported GitHub sections default to proposal permission.

The permission lattice is:

```text
hidden < read-only < propose < direct
```

`lib/strap-permissions.ts` is the pure, dependency-free TypeScript policy source shared byte-identically by three call sites — server payload builders (strip Hidden sections before they leave), the company write-route guards, and the client UI. `lib/creed-permissions.ts` is only a deprecated compatibility re-export shim. The DB helpers `creed_role()` and `creed_section_permission()` encode the same rules in SQL for RLS; this module is their TypeScript twin and the two must stay in sync.

- Company owner/admin human access resolves to direct.
- A member uses the per-section override, defaulting to direct when absent (the permissive default).
- Agent access is the minimum of member section permission, the member's agent ceiling, and the credential's grant mode.
- A credential mode can only narrow access; it cannot grant visibility or mutation absent from live policy.
- Owner/admin manage members and section lifecycle; owner-only operations include Company BYOK, ownership transfer, and deletion.

## Proposals, direct edits, and history

A proposal can update rich text or request create, delete, rename, recolor, or reorder. It carries attribution, reason/impact/confidence metadata, status, and usually a base revision.

For Company review:

- owner/admin can review visible proposals;
- members can review only where they have direct access;
- authors may withdraw but authorship does not confer approval;
- new-section proposals require owner/admin review (a new section has no existing section to hold a permission on, so a member's default `direct` would otherwise let them approve structural changes);
- stale base revisions cannot overwrite newer content.

Direct Company edits also require `baseRevision`. Successful mutations record activity and a section version; restore creates a new revision instead of erasing history. Personal proposal handling is more client-oriented, and some structural outcomes rely on the next full-state persistence cycle. Do not interchange these paths — Company section writes never go through the personal full-state PUT.

## Onboarding

### Personal

1. The user answers a short questionnaire.
2. `lib/onboarding/compile.ts` creates a deterministic five-section skeleton (Identity, Goals, Work, Preferences, Routines), all agent-writable.
3. The product provides a composition prompt for an external assistant.
4. Returned Markdown is previewed, parsed, and claimed as the initial Personal Strap.
5. Completion enters the hosted app; there is no paid-plan gate.

### Company

1. `POST /api/app/company` idempotently creates or resumes the owner's one Company shell and owner membership via `provision_company_creed`, then makes it active.
2. The owner answers organization questions.
3. `lib/onboarding/compile-company.ts` prepares eight sections and a composition prompt.
4. Pasted Markdown maps to sections by heading.
5. Completion activates the Company Strap and clears resume state; invites follow and are not paid-seat purchases.

The app layout scans all owned Company records for unfinished setup so a stale Personal active cookie cannot hide a resume: a dual-Strap owner whose active cookie points at their Personal Strap is still redirected into company setup when an owned Company Strap reports `needsSetup`.

## Collaboration and profile files

Company editing combines server-authoritative writes with realtime and bounded polling. Local pending sections, proposal suppression, and short mutation-freeze windows prevent older fetches from overwriting optimistic changes.

GitHub serialization defaults new integrations to `strap.md`, uses `##` as section boundaries, shifts nested headings for export, reverses the shift on import, and preserves accent in `<!-- creed:accent=... -->`. That comment is a retained format identifier. The round trip is designed for supported editor markup, not arbitrary byte preservation.

`lib/profile-file.ts` defines path behavior:

- absent/blank or configured `strap.md`: read `strap.md`, then `creed.md` fallback;
- any other explicit path, including `creed.md`: read only that path;
- push refuses to create `strap.md` beside a fallback-resolved `creed.md` without explicit migration.

Personal has pull preview/apply. Company currently supports push only — applying a GitHub import overwrites sections via the personal full-state persist, which is blocked for Company Straps, so pull/apply returns an error for a managed Company context.

## Source paths and change checks

- Domain types/agent contract: `lib/strap-data.ts`
- Permission rules: `lib/strap-permissions.ts`
- Personal persistence: `lib/strap-backend.ts`
- Company writes/versioning: `lib/company-sections.ts`
- Membership/context: `lib/strap-membership.ts`, `lib/strap-context.ts`
- Markdown/profile paths: `lib/strap-markdown.ts`, `lib/rich-text.ts`, `lib/profile-file.ts`
- State validation: `lib/validation/strap-state.ts`
- UI orchestration: `components/strap/strap-provider.tsx`, `components/strap/strap-switcher.tsx`, `components/strap/file-screen.tsx`
- Skills library (neighbor): `lib/skills.ts`, `lib/skill-tools.ts` — see [domain/skills-system.md](/openwiki/domain/skills-system.md)

Verify Personal and Company separately; human and agent outcomes; hidden/read/propose/direct modes; stale revisions/history; TypeScript and SQL policy twins; and profile round trips/fallback conflicts. Representative tests include `company-permissions`, `company-onboarding`, `company-proposal-drafts`, `editing-system`, `rich-text-equivalence`, `github-roundtrip`, `profile-file`, and Strap compatibility/brand suites.
