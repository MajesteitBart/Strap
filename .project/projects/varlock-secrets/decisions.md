---
name: Varlock secrets provider
slug: varlock-secrets
owner: MajesteitBart
created: 2026-09-16T01:51:56Z
updated: 2026-09-16T01:51:56Z
---

# Decisions: Varlock secrets provider

- Use a separate audited HTTP reveal boundary. Ordinary MCP returns no plaintext.
- Opt-in grants name immutable item IDs, never names. Empty is the default. Context-editing modes do not imply secret grants.
- Reuse live Personal/Company Vault permissions and required audit, with key attribution.
- Default and named instances use one key per profile. No OAuth secret scopes or plugin login state.
- Use `impliesSensitive` and an internal `strapAccessKey` type; fetch fresh without disk cache or automatic retries.
- CommonJS follows the official provider pattern. A relocation test found Node native ESM could not resolve plugin-lib from an unrelated directory; Varlock intercepts CommonJS imports correctly.
- Varlock is a peer/development dependency; esbuild and TypeScript are development-only. The application gains no dependencies.
