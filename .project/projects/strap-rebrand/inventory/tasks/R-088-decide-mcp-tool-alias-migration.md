---
file: "app/mcp/route.ts"
line_numbers:
  - "120-205"
  - "261-482"
  - "946-1335"
  - "1646-1677"
situation: "Protocol: discovered and called MCP tools remain list_creeds, read_creed, propose_creed_update, direct_edit_creed, and creed_* names, including tool-specific error strings."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Decide whether to keep them as permanent wire contracts or add canonical Strap aliases with shared dispatch, telemetry, a deprecation window, and no duplicate ambiguous discovery."
status: done
---

> [!NOTE]
>
> **Reply by user**: Rename first, redesign comes later.
