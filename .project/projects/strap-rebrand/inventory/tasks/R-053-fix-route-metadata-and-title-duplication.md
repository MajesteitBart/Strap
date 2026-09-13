---
file: "app/"
line_numbers:
  - "(creed-app)/*/page.tsx:1-5"
  - "onboarding/page.tsx:1-51"
  - "onboarding/company/page.tsx:1-37"
  - "authorize/page.tsx:1-229"
  - "device/page.tsx:1-103"
  - "login/page.tsx:8-10"
  - "signup/page.tsx:8-10"
situation: "Metadata: authenticated and first-run routes inherit the generic homepage title, while login/signup include | Strap inside a root %s | Strap template and render duplicated titles such as Sign in | Strap | Strap."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Add concise route-specific titles without a repeated brand suffix and verify File, Connections, Settings, Vault, onboarding, OAuth, device, login, signup, and reset titles."
status: done
---
