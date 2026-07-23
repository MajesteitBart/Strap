import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import * as ts from "typescript";

type Term = {
  id: "brand-name" | "legacy-origin" | "legacy-email" | "legacy-cli" | "legacy-filename";
  pattern: RegExp;
};

type Finding = {
  file: string;
  line: number;
  term: Term["id"];
  context: string;
};

type AllowEntry = {
  file: string;
  term: Term["id"];
  context: string;
  occurrences: number;
  category: string;
  rationale: string;
};

const TERMS: readonly Term[] = [
  { id: "brand-name", pattern: /\bCreed\b/g },
  { id: "legacy-origin", pattern: /https:\/\/creed\.md/g },
  { id: "legacy-email", pattern: /hello@creed\.md/g },
  { id: "legacy-cli", pattern: /\b(?:npx\s+)?creed-cli\b/g },
  { id: "legacy-filename", pattern: /(?<!https:\/\/)\bcreed\.md\b/g },
] as const;

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const DOCUMENT_EXTENSIONS = new Set([".md", ".json", ".yaml", ".yml", ".html", ".txt"]);
const EXCLUDED_PREFIXES = [
  ".agents/",
  ".claude/",
  ".project/",
  "openwiki/",
  "packages/creed-cli/",
  "supabase/migrations/",
  "tests/",
] as const;

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/");
}

function isIncludedFile(file: string): boolean {
  if (file === "tsconfig.json" || file === "scripts/strap-rebrand-allowlist.json") return false;
  if (EXCLUDED_PREFIXES.some((prefix) => file.startsWith(prefix))) return false;
  if (file.includes("/node_modules/") || file.includes("/dist/") || file.includes("/.next")) return false;
  const extension = extname(file);
  return SOURCE_EXTENSIONS.has(extension) || DOCUMENT_EXTENSIONS.has(extension) || file === ".env.example";
}

function compactContext(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function addContextFindings(
  findings: Finding[],
  file: string,
  line: number,
  rawContext: string,
): void {
  const context = compactContext(rawContext);
  if (!context) return;

  for (const term of TERMS) {
    const matches = context.match(term.pattern) ?? [];
    for (let index = 0; index < matches.length; index += 1) {
      findings.push({ file, line, term: term.id, context });
    }
  }
}

function scanSourceFile(file: string, text: string): Finding[] {
  const findings: Finding[] = [];
  const kind = file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);

  function visit(node: ts.Node): void {
    if (ts.isTemplateExpression(node)) {
      const context = node.getText(source);
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      addContextFindings(findings, file, line, context);
    } else if (ts.isStringLiteralLike(node) || ts.isJsxText(node)) {
      const context = ts.isJsxText(node) ? node.getText(source) : node.text;
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      addContextFindings(findings, file, line, context);
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return findings;
}

function scanDocument(file: string, text: string): Finding[] {
  const findings: Finding[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    addContextFindings(findings, file, index + 1, line);
  });
  return findings;
}

function findingKey(value: Pick<Finding, "file" | "term" | "context">): string {
  return JSON.stringify([value.file, value.term, value.context]);
}

const root = process.cwd();
const files = execFileSync("rg", ["--files", "--hidden"], {
  cwd: root,
  encoding: "utf8",
})
  .split(/\r?\n/)
  .map(normalizePath)
  .filter(Boolean)
  .filter(isIncludedFile)
  .sort();

const findings = files.flatMap((file) => {
  const text = readFileSync(resolve(root, file), "utf8");
  return SOURCE_EXTENSIONS.has(extname(file))
    ? scanSourceFile(file, text)
    : scanDocument(file, text);
});

const allowlistPath = resolve(root, "scripts/strap-rebrand-allowlist.json");
const allowlist = JSON.parse(readFileSync(allowlistPath, "utf8")) as AllowEntry[];
const invalidEntries = allowlist.filter(
  (entry) =>
    !entry.file ||
    !entry.context ||
    !entry.rationale ||
    !entry.category.startsWith("D-004/") ||
    !Number.isInteger(entry.occurrences) ||
    entry.occurrences < 1,
);

if (invalidEntries.length > 0) {
  process.stderr.write(`Invalid Strap rebrand allowlist entries: ${JSON.stringify(invalidEntries, null, 2)}\n`);
  process.exit(1);
}

const actualCounts = new Map<string, { finding: Finding; count: number }>();
for (const finding of findings) {
  const key = findingKey(finding);
  const current = actualCounts.get(key);
  actualCounts.set(key, { finding, count: (current?.count ?? 0) + 1 });
}

const allowedCounts = new Map(allowlist.map((entry) => [findingKey(entry), entry]));
const unclassified = [...actualCounts.entries()].filter(([key, value]) => {
  const allowed = allowedCounts.get(key);
  return !allowed || allowed.occurrences !== value.count;
});
const stale = allowlist.filter((entry) => {
  const actual = actualCounts.get(findingKey(entry));
  return !actual || actual.count !== entry.occurrences;
});

if (unclassified.length > 0 || stale.length > 0) {
  if (unclassified.length > 0) {
    process.stderr.write("Unclassified or count-mismatched Creed-era customer-visible references:\n");
    for (const [, { finding, count }] of unclassified) {
      process.stderr.write(
        `- ${finding.file}:${finding.line} [${finding.term}] occurrences=${count}\n  ${finding.context}\n`,
      );
    }
  }
  if (stale.length > 0) {
    process.stderr.write(`Stale Strap rebrand allowlist entries:\n${JSON.stringify(stale, null, 2)}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  `Strap rebrand audit passed: ${files.length} files scanned, ${findings.length} classified occurrence(s), ${allowlist.length} exact allowlist entries.\n`,
);
