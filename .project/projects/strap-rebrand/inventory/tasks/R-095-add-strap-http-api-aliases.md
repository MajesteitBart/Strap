---
file: "app/api/creed/"
line_numbers:
  - "route.ts:7-55"
  - "proposals/route.ts:24-74"
  - "write/route.ts:285-323"
situation: "Public API path: the bearer API remains /api/creed, /api/creed/proposals, and /api/creed/write, and generated contracts still point there."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Decide whether to retain the namespace permanently or add /api/strap aliases backed by shared handlers, migrate new guidance and callers, and deprecate only with telemetry."
status: done
---

> [!NOTE]
>
> **Reply by user**: Rename first, redesign comes later.
