---
file: "tests/"
line_numbers:
  - "agent-icon.test.ts:7,23-29"
  - "mcp-connection-status.test.ts:12-19,22-41"
  - "mcp-health-filter.test.ts:32-43"
situation: "Tests: primary CLI fixtures import or label only the legacy Creed CLI, so the green suite misses Strap CLI icon and active-connection regressions."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Make Strap CLI and strap-cli the primary cases, keep explicit separate legacy compatibility cases, and verify roster, revoke, health, and icon behavior for both."
status: done
---
