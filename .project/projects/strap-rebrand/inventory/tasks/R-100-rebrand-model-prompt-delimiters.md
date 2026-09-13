---
file: "lib/ai/tab.ts"
line_numbers:
  - "116-118"
situation: "Model-facing naming: prompt delimiters remain <creed>...</creed> even though no external client depends on the tags."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Change them atomically to a neutral or Strap profile delimiter and update snapshot/output tests."
status: done
---
