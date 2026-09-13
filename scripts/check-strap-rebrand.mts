import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Decision = "compatibility" | "history";

type Finding = {
  file: string;
  kind: "content" | "path";
  occurrences: number;
  fingerprint: string;
};

type AllowEntry = Finding & {
  decision: Decision;
  category: string;
  rationale: string;
};

type Assertion =
  | {
      file: string;
      pattern: string;
      rationale: string;
    }
  | {
      path: string;
      rationale: string;
    };

type Allowlist = {
  version: 2;
  entries: AllowEntry[];
  assertions: Assertion[];
};

const ALLOWLIST_PATH = "scripts/strap-rebrand-allowlist.json";
const TERM = /creed/gi;
const HISTORY_PREFIXES = [
  ".project/projects/delano-bootstrap/",
  ".project/projects/strap-rebrand/",
  ".project/projects/strap-rename-completion/",
  "supabase/migrations/",
] as const;

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/");
}

function fingerprint(parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\n")).digest("hex");
}

function gitFiles(root: string, args: readonly string[]): string[] {
  return execFileSync("git", ["ls-files", ...args, "-z"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  })
    .split("\0")
    .map(normalizePath)
    .filter(Boolean)
    .sort();
}

function contentFinding(file: string, buffer: Buffer): Finding | null {
  if (buffer.includes(0)) return null;

  const text = buffer.toString("utf8");
  const contexts: string[] = [];
  for (const match of text.matchAll(TERM)) {
    const offset = match.index;
    const before = text.slice(0, offset);
    const line = before.split(/\r?\n/).length;
    const lineText = text.slice(before.lastIndexOf("\n") + 1, text.indexOf("\n", offset) === -1 ? text.length : text.indexOf("\n", offset));
    contexts.push(`${line}:${lineText.trim()}`);
  }

  return contexts.length === 0
    ? null
    : {
        file,
        kind: "content",
        occurrences: contexts.length,
        fingerprint: fingerprint(contexts),
      };
}

function pathFinding(file: string): Finding | null {
  const matches = file.match(TERM) ?? [];
  return matches.length === 0
    ? null
    : {
        file,
        kind: "path",
        occurrences: matches.length,
        fingerprint: fingerprint([file]),
      };
}

function findingKey(value: Pick<Finding, "file" | "kind">): string {
  return `${value.kind}:${value.file}`;
}

function defaultClassification(finding: Finding): Pick<AllowEntry, "decision" | "category" | "rationale"> {
  if (HISTORY_PREFIXES.some((prefix) => finding.file.startsWith(prefix))) {
    return {
      decision: "history",
      category: "historical-delivery-or-schema",
      rationale: "Preserved historical delivery evidence or forward-only schema history; rewriting would falsify repository history.",
    };
  }

  if (finding.file.startsWith("packages/creed-cli/")) {
    return {
      decision: "compatibility",
      category: "legacy-cli-package",
      rationale: "Preserved legacy CLI package and installed client compatibility surface.",
    };
  }

  return {
    decision: "compatibility",
    category: finding.kind === "path" ? "stable-compatibility-path" : "stable-compatibility-content",
    rationale: finding.kind === "path"
      ? "Exact tracked path retained until its separately staged compatibility migration."
      : "Reviewed exact-file occurrence set containing internal, protocol, data, test, or explicitly labeled compatibility terminology.",
  };
}

function validateAllowlist(value: unknown): asserts value is Allowlist {
  if (!value || typeof value !== "object") throw new Error("Allowlist must be an object.");
  const candidate = value as Partial<Allowlist>;
  if (candidate.version !== 2 || !Array.isArray(candidate.entries) || !Array.isArray(candidate.assertions)) {
    throw new Error("Allowlist must use schema version 2 with entries and assertions arrays.");
  }

  for (const entry of candidate.entries) {
    if (
      !entry.file ||
      !["content", "path"].includes(entry.kind) ||
      !Number.isInteger(entry.occurrences) ||
      entry.occurrences < 1 ||
      !/^[a-f0-9]{64}$/.test(entry.fingerprint) ||
      !["compatibility", "history"].includes(entry.decision) ||
      !entry.category ||
      !entry.rationale
    ) {
      throw new Error(`Invalid allowlist entry: ${JSON.stringify(entry)}`);
    }
  }

  for (const assertion of candidate.assertions) {
    const hasFileAssertion =
      "file" in assertion &&
      typeof assertion.file === "string" &&
      typeof assertion.pattern === "string";
    const hasPathAssertion =
      "path" in assertion &&
      typeof assertion.path === "string";
    if ((!hasFileAssertion && !hasPathAssertion) || !assertion.rationale) {
      throw new Error(`Invalid positive assertion: ${JSON.stringify(assertion)}`);
    }
  }
}

const root = process.cwd();
const trackedFiles = gitFiles(root, ["--cached"]);
const repositoryFiles = [...new Set([...trackedFiles, ...gitFiles(root, ["--others", "--exclude-standard"])])]
  .filter((file) => {
    const path = resolve(root, file);
    return existsSync(path) && statSync(path).isFile();
  })
  .sort();
const missingTrackedFiles = trackedFiles.length - repositoryFiles.filter((file) => trackedFiles.includes(file)).length;
const findings: Finding[] = [];
let binaryFiles = 0;

for (const file of repositoryFiles) {
  const buffer = readFileSync(resolve(root, file));
  if (buffer.includes(0)) binaryFiles += 1;
  // Generated classifications contain the exact paths and rationales being
  // audited. Scanning those records would make the allowlist recursively
  // classify and fingerprint itself.
  const content = file === ALLOWLIST_PATH ? null : contentFinding(file, buffer);
  const path = pathFinding(file);
  if (content) findings.push(content);
  if (path) findings.push(path);
}

const allowlistPath = resolve(root, ALLOWLIST_PATH);
const parsed = JSON.parse(readFileSync(allowlistPath, "utf8")) as unknown;
validateAllowlist(parsed);

if (process.argv.includes("--update-allowlist")) {
  const previous = new Map(parsed.entries.map((entry) => [findingKey(entry), entry]));
  const entries = findings.map((finding): AllowEntry => {
    const old = previous.get(findingKey(finding));
    const classification = old
      ? { decision: old.decision, category: old.category, rationale: old.rationale }
      : defaultClassification(finding);
    return { ...finding, ...classification };
  });
  const next: Allowlist = { version: 2, entries, assertions: parsed.assertions };
  writeFileSync(allowlistPath, `${JSON.stringify(next, null, 2)}\n`);
  process.stdout.write(`Updated ${ALLOWLIST_PATH} with ${entries.length} exact tracked-file classifications.\n`);
  process.exit(0);
}

const actual = new Map(findings.map((finding) => [findingKey(finding), finding]));
const allowed = new Map(parsed.entries.map((entry) => [findingKey(entry), entry]));
const unclassified = findings.filter((finding) => !allowed.has(findingKey(finding)));
const stale = parsed.entries.filter((entry) => {
  const finding = actual.get(findingKey(entry));
  return !finding || finding.occurrences !== entry.occurrences || finding.fingerprint !== entry.fingerprint;
});

const failedAssertions: Assertion[] = [];
for (const assertion of parsed.assertions) {
  if ("path" in assertion) {
    if (!existsSync(resolve(root, assertion.path))) failedAssertions.push(assertion);
  } else {
    const file = readFileSync(resolve(root, assertion.file), "utf8");
    if (!new RegExp(assertion.pattern, "m").test(file)) failedAssertions.push(assertion);
  }
}

if (unclassified.length || stale.length || failedAssertions.length) {
  if (unclassified.length) {
    process.stderr.write(`Unclassified tracked Creed findings:\n${JSON.stringify(unclassified, null, 2)}\n`);
  }
  if (stale.length) {
    process.stderr.write(`Stale or changed exact classifications:\n${JSON.stringify(stale, null, 2)}\n`);
  }
  if (failedAssertions.length) {
    process.stderr.write(`Failed positive Strap assertions:\n${JSON.stringify(failedAssertions, null, 2)}\n`);
  }
  process.stderr.write("Review the change, then run `npm run audit:brand -- --update-allowlist` to record an intentional classification.\n");
  process.exit(1);
}

const contentOccurrences = findings
  .filter((finding) => finding.kind === "content")
  .reduce((total, finding) => total + finding.occurrences, 0);
const contentFiles = new Set(findings.filter((finding) => finding.kind === "content").map((finding) => finding.file)).size;
const pathFiles = findings.filter((finding) => finding.kind === "path").length;
const historyEntries = parsed.entries.filter((entry) => entry.decision === "history").length;

process.stdout.write(
  `Strap rebrand audit passed: ${repositoryFiles.length} current repository files ` +
  `(${trackedFiles.length} tracked, ${missingTrackedFiles} tracked path(s) absent during this worktree rename, ${binaryFiles} binary), ` +
  `${contentOccurrences} case-insensitive Creed occurrence(s) across ${contentFiles} file(s), ` +
  `${pathFiles} Creed-named path(s), ${parsed.entries.length} exact classifications ` +
  `(${historyEntries} history, ${parsed.entries.length - historyEntries} compatibility; scanner config self-record excluded), ` +
  `${parsed.assertions.length} positive Strap assertion(s).\n`,
);
