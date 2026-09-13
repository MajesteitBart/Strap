import { basename, dirname, join, resolve } from "node:path";
import {
  validateSkillName,
  validateStoredSkill,
  type SkillBundle,
  type StoredSkill,
} from "./bundle.js";
import {
  installSkill,
  readLedger,
  readSkillDirectory,
  recordSynced,
  saveLedger,
  skillDigest,
  withSyncLock,
  type SyncEntry,
} from "./files.js";

export type SkillRemote = {
  list(): Promise<{
    strapId: string;
    canManage: boolean;
    skills: { name: string; archived: boolean }[];
  }>;
  get(name: string): Promise<StoredSkill>;
  publish(bundle: SkillBundle, baseRevision: number): Promise<StoredSkill>;
};
export type SyncResult = {
  name: string;
  action:
    "install" | "update" | "publish" | "unchanged" | "archive" | "conflict";
  detail?: string;
  backup?: string;
};

export function syncDecision(
  local: string | null,
  remote: Pick<StoredSkill, "digest" | "archived">,
  base: SyncEntry | undefined,
  push: boolean,
): SyncResult["action"] {
  if (remote.archived)
    return local === null
      ? "unchanged"
      : base && local === base.digest
        ? "archive"
        : "conflict";
  if (local === remote.digest) return "unchanged";
  if (local === null) return base && !base.archived ? "conflict" : "install";
  if (!base) return "conflict";
  if (local === base.digest) return "update";
  if (push && remote.digest === base.digest) return "publish";
  return "conflict";
}

function verifyRemote(
  value: unknown,
  strapId: string,
  name: string,
): StoredSkill {
  const skill = validateStoredSkill(value);
  if (
    skill.strapId !== strapId ||
    skill.name !== name ||
    skillDigest(skill) !== skill.digest
  )
    throw new Error(
      "The server returned a mismatched skill, profile, or content digest.",
    );
  return skill;
}

export async function syncSkills(input: {
  root: string;
  server: string;
  remote: SkillRemote;
  push: boolean;
  dryRun?: boolean;
  name?: string;
}): Promise<SyncResult[]> {
  const root = resolve(input.root);
  const run = async () => {
    const library = await input.remote.list();
    const ledger = await readLedger(root, input.server, library.strapId);
    const selected = input.name
      ? library.skills.filter(
          (skill) => skill.name === validateSkillName(input.name),
        )
      : library.skills;
    if (input.name && selected.length === 0)
      throw new Error(`Skill ${input.name} is not in this library.`);
    const plans = [];
    // Preflight the entire selection before any publication or replacement.
    for (const item of selected) {
      const name = validateSkillName(item.name);
      const remote = verifyRemote(
        await input.remote.get(name),
        library.strapId,
        name,
      );
      const base = Object.hasOwn(ledger.skills, name)
        ? ledger.skills[name]
        : undefined;
      const local = await readSkillDirectory(
        join(root, name),
        base?.executables,
      );
      const digest = local ? skillDigest(local) : null;
      const action = syncDecision(digest, remote, base, input.push);
      plans.push({
        name,
        remote,
        local,
        digest,
        base,
        action:
          action === "publish" && !library.canManage
            ? ("conflict" as const)
            : action,
      });
    }
    if (plans.some((plan) => plan.action === "conflict")) {
      return plans.map(({ name, action }) => ({
        name,
        action,
        detail:
          action === "conflict"
            ? "Local and published versions differ. No skills were changed. Compare them, then publish with an explicit --base-revision or move your local folder aside before pulling."
            : "Not applied because another selected skill conflicts.",
      }));
    }
    // Bind even an empty library before applying any planned operations.
    if (!input.dryRun) await saveLedger(root, ledger);
    const results: SyncResult[] = [];
    for (const plan of plans) {
      let remote = plan.remote;
      let backup;
      if (!input.dryRun) {
        const current = await readSkillDirectory(
          join(root, plan.name),
          plan.base?.executables,
        );
        if ((current ? skillDigest(current) : null) !== plan.digest)
          throw new Error(
            `Local skill ${plan.name} changed during sync. No changes were made to this skill.`,
          );
        if (plan.action === "publish" && plan.local)
          remote = verifyRemote(
            await input.remote.publish(plan.local, remote.revision),
            library.strapId,
            plan.name,
          );
        if (["install", "update", "archive"].includes(plan.action))
          backup = await installSkill(
            root,
            remote,
            plan.digest,
            plan.base?.executables,
          );
        recordSynced(ledger, remote);
        await saveLedger(root, ledger);
      }
      results.push({
        name: plan.name,
        action: plan.action,
        ...(backup ? { backup } : {}),
      });
    }
    return results;
  };
  return input.dryRun ? run() : withSyncLock(root, run);
}

export async function pushSkill(input: {
  directory: string;
  server: string;
  remote: SkillRemote;
  baseRevision?: number;
  dryRun?: boolean;
}): Promise<SyncResult> {
  const directory = resolve(input.directory);
  const root = dirname(directory);
  const run = async (): Promise<SyncResult> => {
    const library = await input.remote.list();
    if (!library.canManage)
      throw new Error(
        "Publishing needs a direct connection and profile owner or Company admin.",
      );
    const ledger = await readLedger(root, input.server, library.strapId);
    const name = validateSkillName(basename(directory));
    const base = Object.hasOwn(ledger.skills, name)
      ? ledger.skills[name]
      : undefined;
    const bundle = await readSkillDirectory(directory, base?.executables);
    if (!bundle) throw new Error(`Skill directory not found: ${directory}`);
    const existing = library.skills.find((entry) => entry.name === name);
    const remote = existing
      ? verifyRemote(await input.remote.get(name), library.strapId, name)
      : null;
    const same =
      remote && !remote.archived && remote.digest === skillDigest(bundle);
    const revision =
      input.baseRevision ?? base?.revision ?? (remote ? undefined : 0);
    if (!same && revision === undefined)
      throw new Error(
        `A published skill already uses ${name}. Compare it first, then pass --base-revision ${remote!.revision} to publish your version.`,
      );
    if (!same && revision !== (remote?.revision ?? 0))
      throw new Error(
        "The published skill changed since your last sync. Compare it before choosing the current --base-revision.",
      );
    if (!input.dryRun) {
      const published = same
        ? remote
        : verifyRemote(
            await input.remote.publish(bundle, revision!),
            library.strapId,
            name,
          );
      recordSynced(ledger, published);
      await saveLedger(root, ledger);
    }
    return { name, action: same ? "unchanged" : "publish" };
  };
  return input.dryRun ? run() : withSyncLock(root, run);
}
