---
file: "components/creed/brand.tsx"
line_numbers:
  - "9-92"
situation: "Internal naming: CreedWordmark, CreedMark, and CreedAgentGlyph already render correct Strap assets and accessible labels."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Introduce StrapWordmark, StrapMark, and StrapAgentGlyph, migrate imports, and retain deprecated Creed aliases only for the approved internal migration window."
status: done
---

> [!NOTE]
>
> **Reply by user**: Rename first, redesign comes later.
