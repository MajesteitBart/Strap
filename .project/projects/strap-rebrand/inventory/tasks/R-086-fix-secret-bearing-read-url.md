---
file: "lib/creed-backend.ts"
line_numbers:
  - "715-716"
situation: "Security and compatibility defect: generated agent guidance builds /api/creed?token=<secret>, but the route rejects query tokens and the URL can leak credentials through history, logs, and referrers."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Stop generating a tokenized URL; expose the endpoint and bearer credential separately, update generated guidance, and add a contract test proving no secret enters a URL."
status: done
---
