---
file: "lib/creed-*.ts, app/api/app/**, and supabase schema"
line_numbers:
  - "pervasive CreedState/CreedSection/creed_id/creeds/creed_* identifiers"
situation: "Internal architecture: modules, types, table/column/RPC names, audit/event names, cookie fields, and source paths remain Creed-named across security- and persistence-critical flows."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Explicitly freeze them or approve a dedicated forward-compatible migration with re-export modules, views/wrappers, backfills, RLS/grant/index/FK recreation, read-old/write-new cutover, and rollback; never global-replace them."
status: done
---

> [!NOTE]
>
> **Reply by user**: Rename first, redesign comes later.
