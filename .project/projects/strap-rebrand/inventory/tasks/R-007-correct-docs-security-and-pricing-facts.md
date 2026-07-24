---
file: "components/marketing/docs-page-view.tsx"
line_numbers:
  - "319-325"
  - "352-360"
situation: "Content: docs still describe monthly credits and top-ups, imply the whole profile is encrypted, claim all tokens are AES-256-GCM encrypted, and overstate per-user RLS and deletion behavior."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Rewrite from current included-key/BYOK behavior and distinguish hashed credentials, encrypted provider tokens, Supabase Vault plaintext boundaries, Company access, service-role authorization, and qualified retention."
status: done
---
