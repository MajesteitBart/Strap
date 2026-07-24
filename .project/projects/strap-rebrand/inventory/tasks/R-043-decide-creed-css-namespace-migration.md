---
file: "app/globals.css"
line_numbers:
  - "58-92"
  - "157-182"
  - "241-260"
  - "353-382"
  - "439-927"
situation: "Internal naming: --creed-*, .creed-*, animation names, rich-text classes, and persisted HTML selectors remain pervasive compatibility contracts."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Decide whether internal namespace purity warrants an additive --strap- and dual-selector migration; never perform a destructive global replacement because stored rich text, tests, and app state depend on these names."
status: done
---

> [!NOTE]
>
> **Reply by user**: If you rename them all, it won't be an issue, right? replace them!
