---
file: "lib/secret-crypto.ts"
line_numbers:
  - 8
  - 11
situation: "Configuration and cryptography: CREED_ENCRYPTION_SECRET remains the key-derivation input and cannot be renamed or rotated casually."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "If a Strap name is required, add STRAP_ENCRYPTION_SECRET with fallback to the old variable and identical key derivation; require a separate explicit re-encryption plan before removing or rotating the old secret."
status: done
---

> [!NOTE]
>
> **Reply by user**: Rename first, redesign comes later.
