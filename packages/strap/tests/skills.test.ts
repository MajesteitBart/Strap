import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  symlink,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  validateSkillBundle,
  type SkillBundle,
  type StoredSkill,
} from "../src/skills/bundle.js";
import { readSkillDirectory, skillDigest } from "../src/skills/files.js";
import { pushSkill, syncSkills, type SkillRemote } from "../src/skills/sync.js";
import { parseSkillsCommand } from "../src/skills/command.js";

function bundle(
  body = "Read changed files.",
  name = "review-code",
): SkillBundle {
  return validateSkillBundle({
    files: [
      {
        path: "SKILL.md",
        content: `---\nname: ${name}\ndescription: Review code changes.\n---\n\n${body}\n`,
        encoding: "utf8",
        executable: false,
      },
      {
        path: "assets/icon.bin",
        content: "AP8=",
        encoding: "base64",
        executable: false,
      },
    ],
  });
}

function memoryRemote() {
  const store = new Map<string, StoredSkill>();
  let writes = 0;
  const remote: SkillRemote = {
    async list() {
      return {
        strapId: "profile-a",
        canManage: true,
        skills: [...store.values()],
      };
    },
    async get(name) {
      const value = store.get(name);
      if (!value) throw new Error("Missing skill");
      return structuredClone(value);
    },
    async publish(value, baseRevision) {
      const current = store.get(value.name);
      if ((current?.revision ?? 0) !== baseRevision)
        throw new Error("Revision conflict");
      writes++;
      const next: StoredSkill = {
        ...value,
        id: value.name,
        strapId: "profile-a",
        revision: baseRevision + 1,
        digest: skillDigest(value),
        fileCount: value.files.length,
        byteCount: 10,
        updatedAt: new Date().toISOString(),
        archived: false,
      };
      store.set(value.name, next);
      return structuredClone(next);
    },
  };
  return { remote, store, writes: () => writes };
}

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), "strap-skills-test-"));
  // This exact temporary directory is created and owned by this test.
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("an empty library binds the directory while dry-run stays read-only", async (t) => {
  const root = await fixture(t), dir = join(root, "skills");
  const { remote } = memoryRemote();
  await syncSkills({ root: dir, server: "server", remote, push: true, dryRun: true });
  await assert.rejects(access(dir));
  assert.deepEqual(await syncSkills({ root: dir, server: "server", remote, push: true }), []);
  const secondProfile: SkillRemote = {
    ...remote,
    list: async () => ({ strapId: "profile-b", canManage: true, skills: [] }),
  };
  await assert.rejects(
    syncSkills({ root: dir, server: "server", remote: secondProfile, push: true }),
    /another server or profile/,
  );
  await assert.rejects(
    syncSkills({ root: dir, server: "other-server", remote, push: false }),
    /another server or profile/,
  );
});

test("valid skill names cannot inherit a phantom sync entry from the ledger prototype", async (t) => {
  const root = await fixture(t);
  const { remote } = memoryRemote();
  await remote.publish(bundle("Read changed files.", "constructor"), 0);
  const result = await syncSkills({
    root: join(root, "skills"),
    server: "server",
    remote,
    push: false,
  });
  assert.equal(result[0]?.action, "install");
  assert.match(
    await readFile(join(root, "skills", "constructor", "SKILL.md"), "utf8"),
    /name: constructor/,
  );
});

test("publish on one device, pull on another, then sync edits without changing binary assets", async (t) => {
  const root = await fixture(t);
  const { remote, writes } = memoryRemote();
  await remote.publish(bundle(), 0);
  const a = join(root, "a", "skills"),
    b = join(root, "b", "skills");
  for (const dir of [a, b])
    assert.equal(
      (
        await syncSkills({ root: dir, server: "server", remote, push: false })
      )[0]?.action,
      "install",
    );
  await writeFile(
    join(a, "review-code", "SKILL.md"),
    bundle("Check regression tests.").files[0]!.content,
  );
  assert.equal(
    (await syncSkills({ root: a, server: "server", remote, push: true }))[0]
      ?.action,
    "publish",
  );
  const result = await syncSkills({
    root: b,
    server: "server",
    remote,
    push: true,
  });
  assert.equal(result[0]?.action, "update");
  assert.ok(result[0]?.backup);
  assert.match(
    await readFile(join(b, "review-code", "SKILL.md"), "utf8"),
    /Check regression tests/,
  );
  assert.deepEqual(
    [...(await readFile(join(b, "review-code", "assets", "icon.bin")))],
    [0, 255],
  );
  assert.equal(writes(), 2);
});

test("divergent edits abort every planned change and preserve both copies", async (t) => {
  const root = await fixture(t),
    dir = join(root, "skills");
  const { remote, writes } = memoryRemote();
  await remote.publish(bundle(), 0);
  await syncSkills({ root: dir, server: "server", remote, push: true });
  await writeFile(
    join(dir, "review-code", "SKILL.md"),
    bundle("Local edit").files[0]!.content,
  );
  await remote.publish(bundle("Remote edit"), 1);
  await remote.publish(bundle("Another skill", "another-skill"), 0);
  const result = await syncSkills({
    root: dir,
    server: "server",
    remote,
    push: true,
  });
  assert.ok(result.some((entry) => entry.action === "conflict"));
  assert.match(
    await readFile(join(dir, "review-code", "SKILL.md"), "utf8"),
    /Local edit/,
  );
  await assert.rejects(access(join(dir, "another-skill")));
  assert.equal(writes(), 3);
  assert.match(
    (await remote.get("review-code")).files[0]!.content,
    /Remote edit/,
  );
});

test("dry-run creates no directory; unmanaged folders and profile changes cannot be overwritten", async (t) => {
  const root = await fixture(t),
    dir = join(root, "skills");
  const { remote } = memoryRemote();
  await remote.publish(bundle(), 0);
  await syncSkills({
    root: dir,
    server: "server",
    remote,
    push: true,
    dryRun: true,
  });
  await assert.rejects(access(dir));
  await mkdir(join(dir, "review-code"), { recursive: true });
  await writeFile(
    join(dir, "review-code", "SKILL.md"),
    bundle("My own skill").files[0]!.content,
  );
  assert.equal(
    (await syncSkills({ root: dir, server: "server", remote, push: true }))[0]
      ?.action,
    "conflict",
  );
  await assert.rejects(
    pushSkill({
      directory: join(dir, "review-code"),
      server: "server",
      remote,
    }),
    /base-revision/,
  );
  await pushSkill({
    directory: join(dir, "review-code"),
    server: "server",
    remote,
    baseRevision: 1,
  });
  await assert.rejects(
    syncSkills({ root: dir, server: "other-server", remote, push: false }),
    /another server or profile/,
  );
});

test("archive backs up an unchanged install, preserves local edits, and restore reinstalls", async (t) => {
  const root = await fixture(t),
    dir = join(root, "skills");
  const { remote, store } = memoryRemote();
  const initial = await remote.publish(bundle(), 0);
  await syncSkills({ root: dir, server: "server", remote, push: false });
  store.set(initial.name, { ...initial, archived: true, revision: 2 });
  const result = await syncSkills({
    root: dir,
    server: "server",
    remote,
    push: false,
  });
  assert.equal(result[0]?.action, "archive");
  await assert.rejects(access(join(dir, initial.name)));
  assert.ok(result[0]?.backup);
  await access(join(result[0]!.backup!, "SKILL.md"));
  store.set(initial.name, { ...initial, revision: 3 });
  assert.equal(
    (await syncSkills({ root: dir, server: "server", remote, push: false }))[0]
      ?.action,
    "install",
  );
  await writeFile(
    join(dir, initial.name, "SKILL.md"),
    bundle("Local work").files[0]!.content,
  );
  store.set(initial.name, { ...initial, archived: true, revision: 4 });
  assert.equal(
    (await syncSkills({ root: dir, server: "server", remote, push: false }))[0]
      ?.action,
    "conflict",
  );
});

test("directory symlinks and nested junctions fail before reading or writing", async (t) => {
  const root = await fixture(t),
    outside = join(root, "outside"),
    dir = join(root, "skills");
  await mkdir(outside);
  await mkdir(dir);
  await writeFile(join(outside, "SKILL.md"), bundle().files[0]!.content);
  await symlink(outside, join(dir, "review-code"), "junction");
  await assert.rejects(
    readSkillDirectory(join(dir, "review-code")),
    /symlink or junction/,
  );
  const { remote } = memoryRemote();
  await remote.publish(bundle(), 0);
  await assert.rejects(
    syncSkills({ root: dir, server: "server", remote, push: true }),
    /symlink or junction/,
  );
  assert.match(
    await readFile(join(outside, "SKILL.md"), "utf8"),
    /Read changed files/,
  );
});

test("CLI option validation and skill target locations are deterministic", () => {
  assert.equal(
    dirname(parseSkillsCommand(["pull", "--target", "claude"]).root).endsWith(
      ".claude",
    ),
    true,
  );
  for (const args of [
    ["push"],
    ["list", "--global"],
    ["sync", "--dir", "x", "--global"],
    ["pull", "--target", "unknown"],
    ["sync", "--base-revision", "1"],
  ])
    assert.throws(() => parseSkillsCommand(args));
});
