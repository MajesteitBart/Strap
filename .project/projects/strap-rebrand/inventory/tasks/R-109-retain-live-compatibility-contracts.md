---
file: "multiple runtime compatibility surfaces"
line_numbers:
  - "app/mcp/route.ts:52,2388"
  - "lib/profile-file.ts:legacy filename constant"
  - "app/layout.tsx:creed:theme"
  - "next.config.ts:CREED_CSP_ENFORCE/CREED_DIST_DIR"
situation: "Compatibility: /api/creed/**, creed_* tools, creed://profile, creed_key_, X-Creed-CLI-Agent, creed.md fallback, legacy origin, environment names, and stored state keys serve installed clients and existing data."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Retain and test these contracts until individually approved migration and removal criteria exist; keep them clearly labeled as compatibility rather than customer branding."
status: done
---
