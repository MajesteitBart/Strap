---
file: "components/marketing/strap-home.tsx"
line_numbers:
  - "45-54"
  - 230
  - "242-247"
situation: "Content: Browse skills leads to docs with no skills content, signed-out resource actions lead directly to authenticated routes, and the assembly panel uses a nonexistent strap equip command."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Point public visitors at real explainers or auth-safe entry points and replace the command with tested Strap CLI syntax unless the equip command is implemented."
status: done
---
