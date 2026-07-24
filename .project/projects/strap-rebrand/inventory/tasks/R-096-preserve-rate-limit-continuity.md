---
file: "app/api/creed/"
line_numbers:
  - "route.ts:29-33"
  - "proposals/route.ts:41-45"
  - "write/route.ts:302-306"
situation: "Operational identity: rate-limit scopes are creed-read, creed-proposals, and creed-write."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "If public API aliases are added, keep or dual-key these scopes so a cosmetic rename cannot reset limits or create a bypass."
status: done
---

> [!NOTE]
>
> **Reply by user**: Rename first, redesign comes later.
