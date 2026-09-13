---
file: "components/creed/"
line_numbers:
  - "agent-icon-stack.tsx:10-18,72-92"
  - "inline-proposal-diff.tsx:207-218,357-369,496-504"
  - "review-pill.tsx:302-313"
  - "panel.tsx:530-537"
  - "section-history-sheet.tsx:145-159"
  - "file-screen.tsx:4470-4482,4511-4548"
situation: "Brand name: persisted first-party proposal and activity records can carry Creed or possessive Creed names, and several visible/accessible components render those raw values."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Add one display-only normalizer that maps known first-party legacy attribution values to Strap for text, icons, and aria-labels while preserving stored audit history and arbitrary third-party names."
status: done
---
