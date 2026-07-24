---
file: "lib/{oauth,oauth-device}.ts"
line_numbers:
  - "oauth.ts:146,189,255-256"
  - "oauth-device.ts:54"
situation: "Credential contract: public OAuth client, code, access, refresh, and device values use creed_client, creed_ac, creed_at, creed_rt, and creed_dc_ prefixes."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Keep them or introduce Strap prefixes for new issuance with dual lookup, rotation, re-registration, and rollback; do not cosmetically rewrite stored hashed credentials."
status: done
---

> [!NOTE]
>
> **Reply by user**: Rename first, redesign comes later.
