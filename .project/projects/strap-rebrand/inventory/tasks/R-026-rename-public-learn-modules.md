---
file: "lib/marketing/learn/"
line_numbers:
  - "connect-creed-to-*.ts:3"
  - "creed-vs-*.ts:3"
  - "index.ts:23-32,52-60"
situation: "Maintainability and naming: public Learn source filenames and exports remain Creed-named even though live slugs and titles are Strap."
note: "Completed with evidence in .project/projects/strap-rename-completion/; any remaining Creed reference is an explicitly tested compatibility or historical contract."
resolution: "Rename modules and exports to connect-strap-* and strap-vs-*; retain only intentional permanent URL redirects for previously published slugs."
status: done
---
