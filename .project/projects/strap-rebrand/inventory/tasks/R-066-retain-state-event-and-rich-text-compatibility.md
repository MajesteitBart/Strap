---
file: "app/globals.css and components/creed/"
line_numbers:
  - "globals.css:58-92,157-182,241-260,439-927"
  - "app/layout.tsx:100"
  - "components/creed/shell.tsx:55-56"
  - "multiple creed:* storage/event keys"
situation: "Compatibility: Creed-named CSS selectors, rich-text classes, storage keys, DOM events, and realtime channel names preserve persisted content and user state but are not visible branding."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Retain these contracts until an explicitly approved additive dual-read/dual-selector migration exists; do not treat them as a customer-copy blocker."
status: done
---
