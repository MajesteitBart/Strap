---
file: "tests/"
line_numbers:
  - "company-permissions.test.ts:106-107"
  - "company-onboarding.test.ts:49,57"
  - "onboarding-graph-tags.test.ts:15"
  - "tab-completion.test.ts:23,28"
  - "strap-agent-contract.test.ts:13-15"
situation: "Tests: current-product fixtures still call the first-party agent or product Creed and the brand contract test does not assert Strap setup aliases or schema defaults."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Use Strap in primary current-product fixtures, retain separate legacy cases only where compatibility is under test, and add positive assertions for Strap aliases and strap.md database defaults."
status: done
---
