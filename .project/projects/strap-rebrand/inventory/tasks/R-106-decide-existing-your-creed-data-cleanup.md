---
file: "supabase/migrations/"
line_numbers:
  - "20260704090000_company_core.sql:130"
  - "20260705090000_company_keys_and_rls.sql:39"
situation: "Persisted brand name: historical backfills can leave existing workspace display names exactly Your Creed."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Decide whether to run a narrowly scoped forward data migration; avoid overwriting an intentional user-chosen identical name and never edit applied migrations."
status: done
---

> [!NOTE]
>
> **Reply by user**: Rename first, redesign comes later.
