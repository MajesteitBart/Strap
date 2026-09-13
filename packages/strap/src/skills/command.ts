import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { CliError } from "../errors.js";
import { writeJson } from "../terminal/output.js";
import { isRecord, validateSkillName, validateStoredSkill } from "./bundle.js";
import { pushSkill, syncSkills, type SkillRemote } from "./sync.js";

export const SKILLS_USAGE = `Usage: strap skills list
       strap skills push <skill-directory> [--base-revision N] [--dry-run]
       strap skills pull [name] [--dir PATH | --target codex|claude [--global]] [--dry-run]
       strap skills sync [name] [--dir PATH | --target codex|claude [--global]] [--dry-run]

The default target is .agents/skills in the current project (Codex-compatible).
--target claude uses .claude/skills. --global uses your home directory.
Pull downloads published skills. Sync also publishes edits to managed skills.
Conflicts stop the selection before changes. Existing files are backed up outside
the skill directory; scripts are never executed. Each directory binds one profile.
Use a separate directory for each Personal or Company library.
`;

export function parseSkillsCommand(args: string[]) {
  const action = args[0];
  if (!["list", "push", "pull", "sync"].includes(action ?? ""))
    throw new CliError(SKILLS_USAGE, 2);
  let name: string | undefined,
    dir: string | undefined,
    target: string | undefined,
    baseRevision: number | undefined;
  let global = false,
    dryRun = false;
  const seen = new Set<string>();
  for (let i = 1; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith("--")) {
      if (name) throw new CliError(SKILLS_USAGE, 2);
      name = arg;
      continue;
    }
    if (seen.has(arg)) throw new CliError(`Repeated option ${arg}.`, 2);
    seen.add(arg);
    if (arg === "--global") {
      global = true;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    const value = args[++i];
    if (!value || value.startsWith("--")) throw new CliError(SKILLS_USAGE, 2);
    if (arg === "--dir") dir = value;
    else if (arg === "--target" && ["codex", "claude"].includes(value))
      target = value;
    else if (
      arg === "--base-revision" &&
      /^\d+$/.test(value) &&
      Number.isSafeInteger(Number(value))
    )
      baseRevision = Number(value);
    else throw new CliError(SKILLS_USAGE, 2);
  }
  if (
    (action === "list" && args.length !== 1) ||
    (action === "push" && (!name || dir || target || global)) ||
    (action !== "push" && baseRevision !== undefined) ||
    (dir && (target || global))
  )
    throw new CliError(SKILLS_USAGE, 2);
  if (action !== "push" && name) validateSkillName(name);
  const root = dir
    ? resolve(dir)
    : join(
        global ? homedir() : process.cwd(),
        target === "claude" ? ".claude" : ".agents",
        "skills",
      );
  return { action: action!, name, root, dryRun, baseRevision };
}

export function mcpSkillRemote(client: Client): SkillRemote {
  async function call(name: string, args: Record<string, unknown>) {
    const result = await client.callTool({ name, arguments: args });
    if (result.isError)
      throw new CliError("The skill operation was rejected by Strap.", 3);
    const content = result.content;
    if (!Array.isArray(content))
      throw new CliError("Strap returned an invalid skill response.");
    const text = content.find(
      (item: unknown) => isRecord(item) && item.type === "text",
    );
    if (!isRecord(text) || typeof text.text !== "string")
      throw new CliError("Strap returned no skill data.");
    const data: unknown = JSON.parse(text.text);
    if (!isRecord(data))
      throw new CliError("Strap returned invalid skill data.");
    return data;
  }
  return {
    async list() {
      const value = await call("strap_list_skills", { includeArchived: true });
      if (
        typeof value.strapId !== "string" ||
        typeof value.canManage !== "boolean" ||
        !Array.isArray(value.skills) ||
        value.skills.length > 100
      )
        throw new CliError("Invalid skill library response.");
      const skills = value.skills.map((entry: unknown) => {
        if (!isRecord(entry) || typeof entry.archived !== "boolean")
          throw new CliError("Invalid skill summary.");
        return {
          ...entry,
          name: validateSkillName(entry.name),
          archived: entry.archived,
        };
      });
      return { strapId: value.strapId, canManage: value.canManage, skills };
    },
    async get(name) {
      return validateStoredSkill(
        (await call("strap_export_skill", { name })).skill,
      );
    },
    async publish(bundle, baseRevision) {
      return validateStoredSkill(
        (await call("strap_publish_skill", { ...bundle, baseRevision })).skill,
      );
    },
  };
}

export async function runSkillsCommand(
  client: Client,
  server: string,
  args: string[],
  json: boolean,
) {
  const options = parseSkillsCommand(args);
  const remote = mcpSkillRemote(client);
  if (options.action === "list") {
    const library = await remote.list();
    if (json) writeJson(library);
    else
      for (const skill of library.skills)
        process.stdout.write(
          `${skill.name}${skill.archived ? " (archived)" : ""}\n`,
        );
    return;
  }
  const results =
    options.action === "push"
      ? [
          await pushSkill({
            directory: options.name!,
            server,
            remote,
            baseRevision: options.baseRevision,
            dryRun: options.dryRun,
          }),
        ]
      : await syncSkills({
          root: options.root,
          server,
          remote,
          push: options.action === "sync",
          dryRun: options.dryRun,
          name: options.name,
        });
  if (json) writeJson({ dryRun: options.dryRun, results });
  else {
    if (options.dryRun)
      process.stdout.write(
        "Preview only. No files or published skills changed.\n",
      );
    if (!results.length)
      process.stdout.write(
        "No shared skills yet. Import one in Strap or run strap skills push <directory>.\n",
      );
    for (const item of results)
      process.stdout.write(
        `${item.action.padEnd(10)} ${item.name}${item.detail ? `: ${item.detail}` : ""}${item.backup ? `\n  Backup: ${item.backup}` : ""}\n`,
      );
  }
  if (results.some((item) => item.action === "conflict"))
    throw new CliError(
      "Skill sync has conflicts. No selected skills were changed.",
      4,
    );
}
