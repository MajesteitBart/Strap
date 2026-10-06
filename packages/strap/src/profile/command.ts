import { createHash } from "node:crypto";
import { chmod, lstat, mkdir, open, readFile, stat, type FileHandle } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { configDirectory } from "../config/paths.js";
import { CliError } from "../errors.js";
import { listAllResources } from "../mcp/client.js";
import { writeJson } from "../terminal/output.js";

export const PROFILE_USAGE = `Usage: strap profile show
       strap profile sync [--file PATH]... [--dry-run]

show prints the part of your Strap that agents load with every request.
sync writes it into a managed block in your agents' global instruction files,
so agents without a Strap connection read the same profile. By default it
updates ~/.agents/AGENTS.md and ~/.claude/CLAUDE.md when they exist; --file
adds or replaces targets. Only the block between the Strap markers changes,
and the first sync keeps a copy of each file in Strap's config folder.
Edit your profile in Strap, not in the files.
`;

export const BLOCK_START =
  "<!-- BEGIN STRAP PROFILE: managed by `strap profile sync`. Edit your profile in Strap; changes here are overwritten. -->";
export const BLOCK_END = "<!-- END STRAP PROFILE -->";

const CORE_URI = "strap://profile/core";
const FULL_URI = "strap://profile";

export function parseProfileCommand(args: string[], home = homedir()) {
  const action = args[0];
  if (action !== "show" && action !== "sync") throw new CliError(PROFILE_USAGE, 2);
  const files: string[] = [];
  let dryRun = false;
  for (let i = 1; i < args.length; i++) {
    const arg = args[i]!;
    if (action === "sync" && arg === "--dry-run" && !dryRun) {
      dryRun = true;
    } else if (action === "sync" && arg === "--file") {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new CliError(PROFILE_USAGE, 2);
      // PowerShell and cmd pass a leading ~ through unexpanded.
      files.push(/^~(?=$|[\\/])/.test(value) ? join(home, value.slice(1)) : resolve(value));
    } else {
      throw new CliError(PROFILE_USAGE, 2);
    }
  }
  const explicit = files.length > 0;
  return {
    action,
    dryRun,
    explicit,
    files: explicit ? files : [join(home, ".agents", "AGENTS.md"), join(home, ".claude", "CLAUDE.md")],
  } as const;
}

/** The managed block for a profile, with a one-line framing for the agent. */
export function profileBlock(profileMarkdown: string, eol = "\n") {
  // A profile can't close the block early by containing the end marker, and
  // its line breaks follow the target file's. The color and loading markers
  // Strap keeps for GitHub sync mean nothing to an agent, so they're dropped.
  const body = profileMarkdown
    .replace(/\r\n/g, "\n")
    .replace(/^<!--\s*(?:creed:accent|strap:loading)=[a-z-]+\s*-->(?:\n\n?|$)/gm, "")
    .replaceAll(BLOCK_END, "<!-- END STRAP PROFILE (quoted) -->")
    .trim()
    .split("\n")
    .join(eol);
  return [
    BLOCK_START,
    "This is my Strap profile: who I am and how I want agents to work with me. What I say in the moment overrides it.",
    "",
    body,
    BLOCK_END,
  ].join(eol);
}

const UTF8_BOM = "\uFEFF";

/**
 * Replaces the managed block in a file, or puts it at the top when the file
 * has none. Everything outside the markers stays byte for byte the same,
 * including a UTF-8 byte order mark at the start.
 */
export function upsertManagedBlock(fileText: string, profileMarkdown: string) {
  const bom = fileText.startsWith(UTF8_BOM) ? UTF8_BOM : "";
  const text = fileText.slice(bom.length);
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const block = profileBlock(profileMarkdown.replace(/\r\n/g, "\n"), eol);
  const start = text.indexOf(BLOCK_START);
  const end = start >= 0 ? text.indexOf(BLOCK_END, start) : -1;
  if (start >= 0 && end >= 0) {
    return bom + text.slice(0, start) + block + text.slice(end + BLOCK_END.length);
  }
  if (!text.trim()) return bom + block + eol;
  return bom + block + eol + eol + text;
}

/**
 * Decodes an instruction file, or returns undefined when it isn't UTF-8 text
 * (UTF-16, for one). Rewriting such a file as UTF-8 would corrupt it.
 */
export function decodeInstructionFile(bytes: Uint8Array) {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return undefined;
  }
  return text.includes("\0") ? undefined : text;
}

export async function readProfile(client: Client) {
  // Servers from before on-demand sections only expose the full profile. Ask
  // which one this server has, so a failed read of the core never falls back
  // to syncing sections meant to load only when relevant.
  const resources = await listAllResources(client);
  const uri = resources.some((resource) => resource.uri === CORE_URI) ? CORE_URI : FULL_URI;
  const result = await client.readResource({ uri });
  const content = result.contents.find((entry) => "text" in entry);
  if (!content || !("text" in content) || typeof content.text !== "string") {
    throw new CliError("Strap returned no profile text.");
  }
  return { text: content.text, uri };
}

async function exists(path: string) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function isBrokenSymlink(path: string) {
  try {
    return (await lstat(path)).isSymbolicLink() && !(await exists(path));
  } catch {
    return false;
  }
}

/**
 * Rewrites an instruction file in place, so it keeps its permissions, Windows
 * access rules, owner and any symlink pointing at it, and no temporary file
 * exists for anyone to plant. A missing file is created exclusively: 0600 on
 * POSIX, the folder's access rules on Windows. A broken symlink is never
 * replaced, because opening it exclusively fails.
 */
export async function writeInstructionFile(file: string, text: string) {
  const data = Buffer.from(text, "utf8");
  let handle: FileHandle;
  try {
    handle = await open(file, "r+");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    handle = await open(file, "wx", 0o600);
  }
  try {
    // Write first, then cut off the old tail, so an interrupted write never
    // leaves an empty file.
    await handle.write(data, 0, data.length, 0);
    await handle.truncate(data.length);
  } finally {
    await handle.close();
  }
}

/**
 * Where the one-time copy of an instruction file goes: a folder inside the
 * CLI's private config directory, next to the stored credentials, so a copy of
 * a private file never lands somewhere more readable than the original.
 */
export function backupPathFor(file: string, directory = configDirectory()) {
  const id = createHash("sha256").update(resolve(file)).digest("hex").slice(0, 12);
  return join(directory, "profile-backups", `${basename(file)}.${id}.before-strap`);
}

/** Saves the original bytes once; returns the path when it wrote a new copy. */
async function backupOnce(file: string, original: Uint8Array) {
  const backup = backupPathFor(file);
  await mkdir(dirname(backup), { recursive: true, mode: 0o700 });
  if (process.platform !== "win32") await chmod(dirname(backup), 0o700);
  let handle: FileHandle;
  try {
    handle = await open(backup, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return undefined;
    throw error;
  }
  try {
    await handle.writeFile(original);
  } finally {
    await handle.close();
  }
  return backup;
}

export async function runProfileCommand(client: Client, args: string[], json: boolean) {
  const options = parseProfileCommand(args);
  const profile = await readProfile(client);
  if (!profile.text.trim()) throw new CliError("Your Strap is empty; nothing to sync.");

  if (options.action === "show") {
    if (json) writeJson({ uri: profile.uri, markdown: profile.text });
    else process.stdout.write(`${profile.text.trim()}\n`);
    return;
  }

  const results: Array<{
    file: string;
    status: "updated" | "unchanged" | "skipped";
    reason?: string;
    backup?: string;
  }> = [];
  for (const file of options.files) {
    const present = await exists(file);
    if (!present && (await isBrokenSymlink(file))) {
      results.push({ file, status: "skipped", reason: "symlink target is missing" });
      continue;
    }
    if (!present && !options.explicit) {
      results.push({ file, status: "skipped", reason: "file does not exist" });
      continue;
    }
    const bytes = present ? await readFile(file) : undefined;
    const before = bytes ? decodeInstructionFile(bytes) : "";
    if (before === undefined) {
      results.push({ file, status: "skipped", reason: "not a UTF-8 text file" });
      continue;
    }
    const after = upsertManagedBlock(before, profile.text);
    if (after === before) {
      results.push({ file, status: "unchanged" });
      continue;
    }
    let backup: string | undefined;
    if (!options.dryRun) {
      if (bytes && !before.includes(BLOCK_START)) backup = await backupOnce(file, bytes);
      await writeInstructionFile(file, after);
    }
    results.push({ file, status: "updated", ...(backup ? { backup } : {}) });
  }

  if (json) {
    writeJson({ uri: profile.uri, dryRun: options.dryRun, files: results });
    return;
  }
  for (const result of results) {
    const verb = result.status === "updated" && options.dryRun ? "would update" : result.status;
    const note = result.reason ?? (result.backup ? `original saved to ${result.backup}` : undefined);
    process.stdout.write(`${verb.padEnd(12)} ${result.file}${note ? ` (${note})` : ""}\n`);
  }
}
