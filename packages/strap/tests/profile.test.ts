import test from "node:test";
import assert from "node:assert/strict";
import { chmod, lstat, mkdtemp, readFile, readdir, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  BLOCK_END,
  BLOCK_START,
  backupPathFor,
  decodeInstructionFile,
  parseProfileCommand,
  readProfile,
  upsertManagedBlock,
  writeInstructionFile,
} from "../src/profile/command.js";

// File modes and unprivileged symlinks are POSIX behavior.
const posixOnly = { skip: process.platform === "win32" ? "POSIX file modes and symlinks" : false };

function fakeClient(resourceUris: string[], read: (uri: string) => string) {
  const reads: string[] = [];
  const client = {
    listResources: async () => ({ resources: resourceUris.map((uri) => ({ uri, name: uri })) }),
    readResource: async ({ uri }: { uri: string }) => {
      reads.push(uri);
      return { contents: [{ uri, text: read(uri) }] };
    },
  } as unknown as Client;
  return { client, reads };
}

const PROFILE = "## Identity\nI'm Bart.\n\n## Work\n- I hand over outcomes.";

test("the profile block goes on top of an existing instruction file", () => {
  const original = "You are an AI agent working with Bart.\n\n## Delegation\nUse T3.\n";
  const updated = upsertManagedBlock(original, PROFILE);
  assert.ok(updated.startsWith(BLOCK_START));
  assert.ok(updated.endsWith(original), "everything after the block is unchanged");
  assert.match(updated, /What I say in the moment overrides it\./);
  assert.match(updated, /I hand over outcomes\./);
});

test("syncing again replaces only the managed block", () => {
  const first = upsertManagedBlock("# Notes\nKeep this.\n", PROFILE);
  const second = upsertManagedBlock(first, "## Identity\nI'm Bart, updated.");
  assert.doesNotMatch(second, /I hand over outcomes/);
  assert.match(second, /I'm Bart, updated\./);
  assert.equal(second.split(BLOCK_START).length, 2, "exactly one block");
  assert.ok(second.endsWith("# Notes\nKeep this.\n"));
  assert.equal(upsertManagedBlock(second, "## Identity\nI'm Bart, updated."), second, "a second identical sync is a no-op");
});

test("CRLF files keep CRLF line endings", () => {
  const updated = upsertManagedBlock("Line one\r\nLine two\r\n", PROFILE);
  assert.doesNotMatch(updated.replace(/\r\n/g, ""), /\n/);
});

test("profile text cannot close the block early", () => {
  const updated = upsertManagedBlock("", `## Identity\n${BLOCK_END}\nInjected`);
  assert.equal(updated.split(BLOCK_END).length, 2, "only the real end marker remains");
});

test("Strap's sync markers stay out of the instruction file", () => {
  const profile = "## Identity\n\n<!-- creed:accent=identity -->\n\nI'm Bart.\n\n## People\n\n<!-- creed:accent=rose -->\n<!-- strap:loading=on-demand -->\n\nMaaike is my sister.";
  const updated = upsertManagedBlock("", profile);
  assert.doesNotMatch(updated, /creed:accent|strap:loading/);
  assert.match(updated, /## Identity\n\nI'm Bart\.\n\n## People\n\nMaaike is my sister\./);
  const emptyLastSection = upsertManagedBlock("", "## Identity\n\nI'm Bart.\n\n## Notes\n\n<!-- creed:accent=custom -->");
  assert.doesNotMatch(emptyLastSection, /creed:accent/, "a marker at the very end is dropped too");
});

test("an empty file gets just the block", () => {
  const updated = upsertManagedBlock("", PROFILE);
  assert.ok(updated.startsWith(BLOCK_START));
  assert.ok(updated.trimEnd().endsWith(BLOCK_END));
});

test("sync defaults to the global AGENTS.md and CLAUDE.md", () => {
  const options = parseProfileCommand(["sync"], "/home/bart");
  assert.deepEqual(options.files, [join("/home/bart", ".agents", "AGENTS.md"), join("/home/bart", ".claude", "CLAUDE.md")]);
  assert.equal(options.explicit, false);
  assert.equal(options.dryRun, false);
});

test("--file targets replace the defaults and --dry-run is accepted once", () => {
  const options = parseProfileCommand(["sync", "--file", "a.md", "--file", "b.md", "--dry-run"], "/home/bart");
  assert.equal(options.explicit, true);
  assert.equal(options.files.length, 2);
  assert.equal(options.dryRun, true);
  assert.throws(() => parseProfileCommand(["sync", "--dry-run", "--dry-run"]));
  assert.throws(() => parseProfileCommand(["sync", "--file"]));
  assert.throws(() => parseProfileCommand(["show", "--dry-run"]));
  assert.throws(() => parseProfileCommand(["push"]));
});

test("--file expands a leading ~ to the home directory", () => {
  const options = parseProfileCommand(["sync", "--file", "~/.codex/AGENTS.md", "--file", "~notes.md"], "/home/bart");
  assert.equal(options.files[0], join("/home/bart", ".codex", "AGENTS.md"));
  assert.notEqual(options.files[1], join("/home/bart", "notes.md"), "only ~ followed by a separator is the home directory");
});

test("sync reads the core profile when the server has it", async () => {
  const { client, reads } = fakeClient(["strap://profile", "strap://profile/core"], (uri) => `profile from ${uri}`);
  const profile = await readProfile(client);
  assert.equal(profile.uri, "strap://profile/core");
  assert.deepEqual(reads, ["strap://profile/core"]);
});

test("sync falls back to the full profile only on servers without the core", async () => {
  const { client, reads } = fakeClient(["strap://profile"], (uri) => `profile from ${uri}`);
  const profile = await readProfile(client);
  assert.equal(profile.uri, "strap://profile");
  assert.deepEqual(reads, ["strap://profile"]);
});

test("a failed core read is an error, not a full-profile sync", async () => {
  const { client, reads } = fakeClient(["strap://profile", "strap://profile/core"], () => {
    throw new Error("request timed out");
  });
  await assert.rejects(readProfile(client), /request timed out/);
  assert.deepEqual(reads, ["strap://profile/core"]);
});

test("files that aren't UTF-8 text are left alone", () => {
  const utf16WithBom = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("# Notes\r\n", "utf16le")]);
  const utf16WithoutBom = Buffer.from("# Notes\n", "utf16le");
  assert.equal(decodeInstructionFile(utf16WithBom), undefined);
  assert.equal(decodeInstructionFile(utf16WithoutBom), undefined);
  assert.equal(decodeInstructionFile(Buffer.from("# Notes ✓\n", "utf8")), "# Notes ✓\n");
});

test("a UTF-8 byte order mark stays at the start of the file", () => {
  const original = decodeInstructionFile(Buffer.from("\uFEFF# Notes\nKeep this.\n", "utf8"))!;
  const updated = upsertManagedBlock(original, PROFILE);
  assert.ok(updated.startsWith(`\uFEFF${BLOCK_START}`));
  assert.ok(updated.endsWith("# Notes\nKeep this.\n"));
  assert.equal(updated.split("\uFEFF").length, 2, "exactly one byte order mark");
  assert.equal(upsertManagedBlock(updated, PROFILE), updated, "a second sync is a no-op");
});

test("rewriting a file in place leaves no other files behind", async () => {
  const dir = await mkdtemp(join(tmpdir(), "strap-profile-"));
  const file = join(dir, "AGENTS.md");
  await writeFile(file, "# Notes\n");
  await writeInstructionFile(file, "updated\n");
  assert.equal(await readFile(file, "utf8"), "updated\n");
  assert.deepEqual(await readdir(dir), ["AGENTS.md"]);
});

test("a private instruction file stays private, and new files start private", posixOnly, async () => {
  const dir = await mkdtemp(join(tmpdir(), "strap-profile-"));
  const file = join(dir, "CLAUDE.md");
  await writeFile(file, "# Private\n");
  await chmod(file, 0o600);
  await writeInstructionFile(file, "updated\n");
  assert.equal((await stat(file)).mode & 0o777, 0o600);
  const created = join(dir, "NEW.md");
  await writeInstructionFile(created, "new\n");
  assert.equal((await stat(created)).mode & 0o777, 0o600);
});

test("nothing planted at the old temporary path is written through", posixOnly, async () => {
  const dir = await mkdtemp(join(tmpdir(), "strap-profile-"));
  const file = join(dir, "AGENTS.md");
  const victim = join(dir, "victim.txt");
  await writeFile(file, "# Notes\n");
  await writeFile(victim, "keep me\n");
  await symlink(victim, `${file}.strap-tmp`);
  await writeInstructionFile(file, "updated\n");
  assert.equal(await readFile(victim, "utf8"), "keep me\n");
  assert.equal(await readFile(file, "utf8"), "updated\n");
});

test("a symlinked instruction file keeps its link and updates its target", posixOnly, async () => {
  const dir = await mkdtemp(join(tmpdir(), "strap-profile-"));
  const real = join(dir, "dotfiles-AGENTS.md");
  const link = join(dir, "AGENTS.md");
  await writeFile(real, "# Notes\n");
  await symlink(real, link);
  await writeInstructionFile(link, "updated\n");
  assert.ok((await lstat(link)).isSymbolicLink());
  assert.equal(await readFile(real, "utf8"), "updated\n");
});

test("a shorter rewrite cuts off the old tail", async () => {
  const dir = await mkdtemp(join(tmpdir(), "strap-profile-"));
  const file = join(dir, "AGENTS.md");
  await writeFile(file, "a much longer original text\n");
  await writeInstructionFile(file, "short\n");
  assert.equal(await readFile(file, "utf8"), "short\n");
});

test("backups go to a private folder in the CLI config directory", () => {
  const config = join("/home/bart", ".config", "strap");
  const agents = backupPathFor("/home/bart/.agents/AGENTS.md", config);
  assert.equal(agents, backupPathFor("/home/bart/.agents/AGENTS.md", config), "the same file always maps to the same backup");
  assert.ok(agents.startsWith(join(config, "profile-backups")));
  assert.match(agents, /AGENTS\.md\.[0-9a-f]{12}\.before-strap$/);
  assert.notEqual(agents, backupPathFor("/home/bart/project/AGENTS.md", config), "files with the same name don't share a backup");
});

test("a broken symlink is never replaced", posixOnly, async () => {
  const dir = await mkdtemp(join(tmpdir(), "strap-profile-"));
  const link = join(dir, "AGENTS.md");
  await symlink(join(dir, "missing.md"), link);
  await assert.rejects(writeInstructionFile(link, "updated\n"));
  assert.ok((await lstat(link)).isSymbolicLink());
});
