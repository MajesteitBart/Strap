---
file: ".agents/skills/creed-repo/"
line_numbers:
  - "SKILL.md:2-39"
  - "agents/openai.yaml:2-4"
  - "references/.last-update.json:2-4"
  - "references/quickstart.md:1-93"
  - "references/architecture/overview.md:5-82"
  - "references/domain/creed-model.md:1-96"
  - "references/integrations/agents-and-oauth.md:5-74"
  - "references/integrations/platform-services.md:15-83"
  - "references/data/schema-and-security.md:12-76"
  - "references/development/testing-and-change-guide.md:17-93"
situation: "Active agent guidance: the repo skill is Creed-first, centers the legacy CLI, contains obsolete Stripe/billing guidance, and predates headless access, device OAuth, Vault, and current free product behavior."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Refresh the skill and every reference from current source, making Strap and packages/strap primary while preserving exact internal compatibility identifiers and current security invariants."
status: done
---
