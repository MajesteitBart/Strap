---
file: "lib/headless-access-shared.ts"
line_numbers:
  - 3
  - "11-21"
situation: "Credential contract: newly issued headless API keys use the creed_key_ wire prefix, which also controls MCP credential-family routing."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Decide whether to issue strap_key_ for new keys while accepting both prefixes; never rewrite existing stored keys and document rotation/removal criteria."
status: done
---

> [!NOTE]
>
> **Reply by user**: Rename first, redesign comes later.
