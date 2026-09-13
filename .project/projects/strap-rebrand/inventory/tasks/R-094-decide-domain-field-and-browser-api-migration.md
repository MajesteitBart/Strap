---
file: "app/api/app/** and OAuth/device forms"
line_numbers:
  - "app/api/app/creeds/route.ts:5,12-13"
  - "app/api/app/creeds/activate/route.ts:5,19-32"
  - "app/authorize/decision/route.ts:98"
  - "app/device/page.tsx:72-74"
  - "multiple app/api/app routes using creedId/creeds"
situation: "Client/server contract: browser APIs, forms, persisted grants, and JSON fields remain /creeds, creedId, creeds, creed_grant, creed_id, and authorized_creed_id."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Choose to freeze internal domain language or version the contract additively with strapId/straps and read-both/write-new behavior; coordinate every caller, schema field, audit record, and rollback."
status: done
---

> [!NOTE]
>
> **Reply by user**: Rename first, redesign comes later.
