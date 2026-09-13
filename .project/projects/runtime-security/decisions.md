---
name: Runtime dependency security
slug: runtime-security
owner: MajesteitBart
created: 2026-09-13T13:06:54Z
updated: 2026-09-13T13:06:54Z
---

# Decisions: Runtime dependency security

## Active Decisions
- Use Next 16.3.5 and matching pinned tooling. Vendor advisories GHSA-p293-qw3h-jr36 and GHSA-2xp9-vwfh-vxw4 affect 16.2.11; 16.3.3 is the documented minimum patched 16.x version.
- Refresh compatible vulnerable dependencies through the lockfile without force or unrelated major upgrades. The resulting full audit reports zero vulnerabilities and npm reports no invalid installed dependency relationships.
- Add regressions for untrusted editor attribute prototype handling and rich-text schema compatibility. Existing navigation lint warnings are reported without changing intentional full-page authentication transitions.

## Superseded Decisions
- None.

## Open Decision Questions
- None recorded at creation.
