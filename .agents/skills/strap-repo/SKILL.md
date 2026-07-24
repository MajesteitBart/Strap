---
name: strap-repo
description: Repository-specific guidance for understanding, reviewing, debugging, changing, testing, and operating Strap. Use for tasks involving the Next.js application, Personal or Company profiles, editor and proposals, Supabase schema or RLS, OAuth/MCP, scoped keys, Vault, the Strap CLI, OpenRouter, GitHub synchronization, security boundaries, routing, or verification.
---

# Strap repository

Work from the repository's current source while using the generated OpenWiki snapshot for architecture, domain, security, integration, and testing context.

## Workflow

1. Locate the Strap checkout root and read its `AGENTS.md` completely. Follow any more specific instruction files for the path being changed.
2. Read [the generated Strap quickstart](../../../openwiki/quickstart.md) for every task. It defines the product boundary, repository map, core invariants, and starting points.
3. Read the task-relevant references listed below before inspecting or editing the affected code path.
4. Read the complete local flow around the target code, including callers, persistence, authorization, and tests. Treat current source, migrations, and package scripts as canonical if a reference is stale.
5. Preserve Personal and Company behavior, human and agent permission paths, authentication boundaries, explicit profile grants and modes, hidden-section filtering, and Vault plaintext boundaries wherever they intersect the change.
6. Keep changes scoped. Preserve unrelated working-tree edits and avoid new dependencies unless clearly justified.
7. Verify in proportion to the change. Use the commands and focused checks in [the generated testing guide](../../../openwiki/development/testing-and-change-guide.md). Run migration and CLI checks when those surfaces are touched.
8. Before finishing, decide whether the work revealed durable repository knowledge. Update the appropriate live source documentation and regenerate OpenWiki rather than hand-editing generated OpenWiki pages, unless the user explicitly asks otherwise.

## Reference routing

- Always read [the generated quickstart](../../../openwiki/quickstart.md).
- For runtime boundaries, route placement, active profile resolution, or Personal versus Company persistence, read [the architecture overview](../../../openwiki/architecture/overview.md).
- For sections, permissions, proposals, review, onboarding, collaboration, and synchronization, read [the domain model](../../../openwiki/domain/strap-model.md).
- For OAuth, MCP, scoped keys, token handling, connection behavior, or either CLI package, read [agents and OAuth](../../../openwiki/integrations/agents-and-oauth.md).
- For Supabase usage, OpenRouter, AI quotas, Vault, GitHub sync, configuration, or deployment, read [platform services](../../../openwiki/integrations/platform-services.md).
- For migrations, RLS, service-role access, authorization, credential storage, privacy, auditing, retention, or plaintext boundaries, read [schema and security](../../../openwiki/data/schema-and-security.md).
- For implementation changes, tests, high-risk files, coverage gaps, or final verification, read [the testing and change guide](../../../openwiki/development/testing-and-change-guide.md).

Read every reference whose topic intersects the request. For cross-cutting work, read all references rather than relying on the quickstart alone.

## Guardrails

- Do not turn Strap into a notes app, journal, chat-memory store, or generic AI wrapper.
- Do not weaken browser, agent, OAuth, RLS, service-role, section-permission, or explicit-grant boundaries.
- Do not expose hidden sections or secrets. Never print or commit `.env.local`, raw credentials, or tokens.
- Do not route Company writes through Personal full-state persistence.
- Do not expose Vault plaintext in list responses, logs, ordinary agent context, or audit payloads. Reveal is explicit, signed-in, authorized, `no-store`, and audited.
- Treat changes to `lib/strap-data.ts` agent instructions and `app/mcp/route.ts` protocol behavior as ecosystem-wide compatibility changes requiring focused validation.
- Use `npx supabase` and load the intended checkout's `.env.local` without printing secrets before configured Supabase operations. Confirm the project reference before remote migration commands.
- Use repository logging utilities instead of `console.log`, keep strict TypeScript free of `any`, and default to server components unless client behavior is required.
