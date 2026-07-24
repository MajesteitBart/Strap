---
file: "lib/marketing/brand.ts"
line_numbers:
  - "20-24"
situation: "Brand name: transitional CREED_TAGLINE, CREED_DESCRIPTION, and CREED_META_TITLE aliases remain primary imports on public surfaces."
note: "Current consumers include components/marketing/site-chrome.tsx:24,1006 and app/llms*.txt/route.ts:2. Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Move public consumers to BRAND_* constants; retain Creed aliases only for genuine compatibility callers and cover canonical values with positive tests."
status: done
---
