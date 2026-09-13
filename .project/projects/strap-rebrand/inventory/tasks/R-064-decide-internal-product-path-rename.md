---
file: "components/creed/ and app/(creed-app)/"
line_numbers:
  - "entire directory trees"
situation: "Maintainability: new Strap product work still lives under Creed-named component and route-group paths, with pervasive Creed* exported component names."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Decide whether maintainability justifies a separate mechanical migration of directories, imports, component names, and route-group commentary; keep runtime URLs and compatibility exports stable during the move."
status: done
---

> [!NOTE]
>
> **Reply by user**: Rename first, redesign comes later.
