---
file: "supabase/migrations/"
line_numbers:
  - "20260419174000_add_github_version_control.sql:20"
  - "20260704180000_company_settings_features.sql:47"
situation: "Persistence defect: live Personal and Company schema defaults still create creed.md even though new integrations should default to strap.md."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Add a new forward-only migration changing both defaults to strap.md without touching existing rows or applied files, and add an executable migration assertion."
status: done
---
