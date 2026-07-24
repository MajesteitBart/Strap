---
file: "lib/agent-icon.ts and components/creed/agent-icon-stack.tsx"
line_numbers:
  - "lib/agent-icon.ts:38-42,55"
  - "components/creed/agent-icon-stack.tsx:9-18"
situation: "Functional brand defect: identity normalization recognizes Creed and Creed CLI aliases but not Strap, Strap CLI, strap-cli, or possessive Strap attribution, so new first-party sessions can render as generic clients."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Add Strap and Strap CLI aliases additively, decide the first-party Strap glyph mapping, and retain every legacy alias for persisted connections and attribution."
status: done
---
