---
file: "scripts/check-strap-rebrand.mts"
line_numbers:
  - "27-56"
  - "91-116"
  - "128-164"
situation: "Quality gate: the scanner is case-sensitive, ignores lowercase/plural/path Creed names, omits comments and identifiers, excludes CSS/SQL/MTS and 388 tracked files, and has no filename or positive canonical-value audit."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Build tracked-file, content, path, and canonical-value passes; cover relevant textual formats and AST/raw categories, report every excluded class, and fail on unindexed visible or active-documentation drift."
status: done
---
