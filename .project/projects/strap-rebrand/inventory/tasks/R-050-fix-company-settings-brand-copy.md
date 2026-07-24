---
file: "components/creed/company-settings.tsx"
line_numbers:
  - "1214-1219"
  - "1751-1793"
  - "1841-1853"
  - "1962-1975"
situation: "Brand name: Company exports use Creed-prefixed JSON filenames and permissions/destructive copy inconsistently lowercases company Strap."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Use strap-activity.json and strap-data.json for new exports and normalize the product term to Company Strap."
status: done
---
