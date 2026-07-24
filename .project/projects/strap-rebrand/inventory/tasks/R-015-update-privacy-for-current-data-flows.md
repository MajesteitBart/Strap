---
file: "components/marketing/privacy-page-view.tsx"
line_numbers:
  - "39-99"
situation: "Legal content: the privacy policy omits Company/member data, invites/email, GitHub OAuth, feedback, headless keys, device OAuth, explicit grants, and Vault secrets, and inaccurately describes credential storage and old token endpoints."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Perform a current data-flow inventory and rewrite collected data, sources, auth/agent access, storage mechanisms, processors, sharing, retention, and deletion for all shipped surfaces."
status: done
---
