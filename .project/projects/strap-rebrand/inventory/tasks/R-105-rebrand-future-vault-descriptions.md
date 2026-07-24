---
file: "supabase/migrations/20260722120000_headless_access_and_secret_vault.sql"
line_numbers:
  - 243
situation: "Brand name in future data: the applied Vault function creates new provider descriptions reading Managed by Creed."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Add a forward CREATE OR REPLACE FUNCTION migration so newly created Vault secrets say Managed by Strap; do not edit the historical migration."
status: done
---
