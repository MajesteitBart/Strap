---
file: "lib/ai/{quality-rubric,quality}.ts"
line_numbers:
  - "quality-rubric.ts:7,123,230"
  - "quality.ts:745,774,818,861"
situation: "Internal and provider-facing naming: CREED_QUALITY_RUBRIC_VERSION and structured-output schema creed_quality_report remain Creed-named."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Add Strap-named symbol aliases and use strap_quality_report after checking provider caching and fixtures; preserve stored rubric version semantics."
status: done
---
