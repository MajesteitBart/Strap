import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  rmdir,
  writeFile,
} from "node:fs/promises";
import {
  basename,
  dirname,
  join,
  parse,
  relative,
  resolve,
  sep,
} from "node:path";
import {
  canonicalSkillContent,
  encodeSkillFile,
  fileBytes,
  isRecord,
  MAX_SKILL_BYTES,
  MAX_SKILL_FILE_BYTES,
  MAX_SKILL_FILES,
  validateSkillBundle,
  validateSkillName,
  validateSkillPath,
  type SkillBundle,
  type StoredSkill,
} from "./bundle.js";

export type SyncEntry = {
  revision: number;
  digest: string;
  executables: string[];
  archived: boolean;
};
export type SyncLedger = {
  version: 1;
  server: string;
  strapId: string;
  skills: Record<string, SyncEntry>;
};
const LEDGER = ".strap-skills.json";

export function skillDigest(bundle: SkillBundle): string {
  return createHash("sha256")
    .update(canonicalSkillContent(bundle))
    .digest("hex");
}

async function statOrNull(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return null;
    throw error;
  }
}

/** Check each existing ancestor, not only the final path (Windows junctions too). */
export async function assertSafePath(path: string): Promise<void> {
  const absolute = resolve(path);
  const root = parse(absolute).root;
  let current = root;
  for (const part of relative(root, absolute).split(sep).filter(Boolean)) {
    current = join(current, part);
    const info = await statOrNull(current);
    if (info?.isSymbolicLink())
      throw new Error(`Refusing a symlink or junction: ${current}`);
  }
}

export async function readSkillDirectory(
  directory: string,
  executables: string[] = [],
  expectedName = basename(directory),
): Promise<SkillBundle | null> {
  await assertSafePath(directory);
  const info = await statOrNull(directory);
  if (!info) return null;
  if (!info.isDirectory())
    throw new Error(`Expected a skill directory: ${directory}`);
  const files = [];
  let total = 0;
  let visited = 0;
  const pending = [""];
  while (pending.length) {
    const prefix = pending.pop()!;
    const entries = await readdir(join(directory, prefix), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Validate before traversing: never collect hidden files or dependencies.
      const absolute = join(directory, path);
      validateSkillPath(path);
      if (++visited > MAX_SKILL_FILES * 4)
        throw new Error("The skill has too many directories or files.");
      await assertSafePath(absolute);
      const info = await lstat(absolute);
      if (info.isDirectory()) {
        pending.push(path);
        continue;
      }
      if (!info.isFile() || info.nlink > 1)
        throw new Error(`Refusing a linked or special file: ${path}`);
      if (
        files.length >= MAX_SKILL_FILES ||
        info.size > MAX_SKILL_FILE_BYTES ||
        total + info.size > MAX_SKILL_BYTES
      )
        throw new Error("Skill bundle exceeds the file or size limit.");
      const handle = await open(
        absolute,
        constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
      );
      let bytes: Buffer;
      try {
        const opened = await handle.stat();
        if (
          !opened.isFile() ||
          opened.nlink > 1 ||
          opened.ino !== info.ino ||
          opened.dev !== info.dev ||
          opened.size !== info.size
        )
          throw new Error(`Skill file changed while opening: ${path}`);
        await assertSafePath(absolute);
        bytes = await handle.readFile();
        const after = await handle.stat();
        if (after.size !== opened.size || after.mtimeMs !== opened.mtimeMs)
          throw new Error(`Skill file changed while reading: ${path}`);
      } finally {
        await handle.close();
      }
      total += bytes.length;
      files.push(
        encodeSkillFile(
          path,
          bytes,
          process.platform === "win32"
            ? executables.includes(path)
            : Boolean(info.mode & 0o111),
        ),
      );
    }
  }
  return validateSkillBundle({ name: expectedName, files });
}

export async function readLedger(
  root: string,
  server: string,
  strapId: string,
): Promise<SyncLedger> {
  await assertSafePath(join(root, LEDGER));
  const info = await statOrNull(join(root, LEDGER));
  if (!info) return { version: 1, server, strapId, skills: {} };
  if (!info.isFile() || info.nlink > 1 || info.size > 128 * 1024)
    throw new Error("Invalid skill sync ledger.");
  const value: unknown = JSON.parse(await readFile(join(root, LEDGER), "utf8"));
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    value.server !== server ||
    value.strapId !== strapId ||
    !isRecord(value.skills)
  ) {
    throw new Error(
      "This skills directory belongs to another server or profile. Choose a separate directory.",
    );
  }
  for (const [name, entry] of Object.entries(value.skills)) {
    validateSkillName(name);
    if (
      !isRecord(entry) ||
      !Number.isSafeInteger(entry.revision) ||
      Number(entry.revision) < 1 ||
      typeof entry.digest !== "string" ||
      !/^[a-f0-9]{64}$/.test(entry.digest) ||
      typeof entry.archived !== "boolean" ||
      !Array.isArray(entry.executables) ||
      entry.executables.some((path) => typeof path !== "string")
    )
      throw new Error("Invalid skill sync entry.");
  }
  return value as SyncLedger;
}

export async function saveLedger(
  root: string,
  ledger: SyncLedger,
): Promise<void> {
  await assertSafePath(join(root, LEDGER));
  const temporary = join(root, `${LEDGER}.${randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify(ledger, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  await rename(temporary, join(root, LEDGER));
}

export function recordSynced(ledger: SyncLedger, skill: StoredSkill): void {
  ledger.skills[skill.name] = {
    revision: skill.revision,
    digest: skill.digest,
    executables: skill.files
      .filter((file) => file.executable)
      .map((file) => file.path),
    archived: skill.archived,
  };
}

export async function withSyncLock<T>(
  root: string,
  operation: () => Promise<T>,
): Promise<T> {
  await assertSafePath(root);
  await mkdir(root, { recursive: true });
  const path = join(root, ".strap-skills.lock");
  await assertSafePath(path);
  let lock;
  try {
    lock = await open(path, "wx", 0o600);
  } catch {
    throw new Error(
      `Another sync may be running. If it stopped, remove ${path} and retry.`,
    );
  }
  try {
    return await operation();
  } finally {
    await lock.close();
    await rm(path);
  }
}

/** Replace a complete skill directory; preserve the original outside agent roots. */
export async function installSkill(
  root: string,
  skill: StoredSkill,
  expected: string | null,
  executables: string[] = [],
): Promise<string | undefined> {
  const destination = join(root, validateSkillName(skill.name));
  const current = await readSkillDirectory(destination, executables);
  if ((current ? skillDigest(current) : null) !== expected)
    throw new Error(
      `Local skill ${skill.name} changed during sync. Retry after reviewing it.`,
    );
  const backups = join(dirname(root), `.${basename(root)}-strap-backups`);
  await assertSafePath(backups);
  await mkdir(backups, { recursive: true });
  const staging = join(backups, `${skill.name}-${randomUUID()}`);
  await mkdir(staging);
  if (!skill.archived) {
    for (const file of skill.files) {
      const path = join(staging, file.path);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, fileBytes(file), {
        flag: "wx",
        mode: file.executable ? 0o755 : 0o644,
      });
    }
  }
  let backup: string | undefined;
  if (current) {
    backup = join(backups, `${skill.name}-${randomUUID()}`);
    await assertSafePath(destination);
    await rename(destination, backup);
    // A local edit during staging stays in the backup and is restored on conflict.
    try {
      const moved = await readSkillDirectoryNamed(
        backup,
        skill.name,
        executables,
      );
      if (skillDigest(moved) !== expected)
        throw new Error("Local files changed during installation.");
    } catch (error) {
      if (!(await statOrNull(destination))) await rename(backup, destination);
      throw error;
    }
  }
  if (!skill.archived) {
    await assertSafePath(destination);
    if (await statOrNull(destination))
      throw new Error(
        `A new local directory appeared at ${destination}. Previous files are preserved at ${backup ?? staging}.`,
      );
    await rename(staging, destination);
  } else {
    await rmdir(staging); // Empty directory created by this invocation only.
  }
  return backup;
}

async function readSkillDirectoryNamed(
  directory: string,
  name: string,
  executables: string[],
): Promise<SkillBundle> {
  // Backups retain a unique directory name, but SKILL.md retains its original name.
  const bundle = await readSkillDirectory(directory, executables, name);
  if (!bundle) throw new Error("The skill backup disappeared during sync.");
  return bundle;
}
