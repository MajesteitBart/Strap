import { copyFile, readFile, stat, writeFile, rename } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
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
and the first sync keeps a copy of each file as <file>.before-strap.
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

export async function runProfileCommand(client: Client, args: string[], json: boolean) {
  const options = parseProfileCommand(args);
  const profile = await readProfile(client);
  if (!profile.text.trim()) throw new CliError("Your Strap is empty; nothing to sync.");

  if (options.action === "show") {
    if (json) writeJson({ uri: profile.uri, markdown: profile.text });
    else process.stdout.write(`${profile.text.trim()}\n`);
    return;
  }

  const results: Array<{ file: string; status: "updated" | "unchanged" | "skipped"; reason?: string }> = [];
  for (const file of options.files) {
    const present = await exists(file);
    if (!present && !options.explicit) {
      results.push({ file, status: "skipped", reason: "file does not exist" });
      continue;
    }
    const before = present ? decodeInstructionFile(await readFile(file)) : "";
    if (before === undefined) {
      results.push({ file, status: "skipped", reason: "not a UTF-8 text file" });
      continue;
    }
    const after = upsertManagedBlock(before, profile.text);
    if (after === before) {
      results.push({ file, status: "unchanged" });
      continue;
    }
    if (!options.dryRun) {
      if (present && !before.includes(BLOCK_START) && !(await exists(`${file}.before-strap`))) {
        await copyFile(file, `${file}.before-strap`);
      }
      const temporary = `${file}.strap-tmp`;
      await writeFile(temporary, after, "utf8");
      await rename(temporary, file);
    }
    results.push({ file, status: "updated" });
  }

  if (json) {
    writeJson({ uri: profile.uri, dryRun: options.dryRun, files: results });
    return;
  }
  for (const result of results) {
    const verb = result.status === "updated" && options.dryRun ? "would update" : result.status;
    process.stdout.write(`${verb.padEnd(12)} ${result.file}${result.reason ? ` (${result.reason})` : ""}\n`);
  }
}
