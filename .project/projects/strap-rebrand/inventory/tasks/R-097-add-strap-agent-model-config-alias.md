---
file: "lib/ai/model-catalog.ts"
line_numbers:
  - 119
  - 127
situation: "Configuration: the undocumented deployment override remains CREED_AGENT_MODEL."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Document precedence and add STRAP_AGENT_MODEL as the preferred alias with safe fallback to CREED_AGENT_MODEL; do not print configuration values."
status: done
---
