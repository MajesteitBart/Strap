import assert from "node:assert/strict";
import test from "node:test";
import { parseVaultCommand } from "../src/vault/command.js";
import { formatVaultSchema, matchesVaultQuery, terminalText, vaultEnvName } from "../src/vault/schema.js";

const reference = "secret://11111111-1111-4111-8111-111111111111";

test("schema output refuses a partial Vault listing", async () => {
  const { runVaultCommand } = await import("../src/vault/command.js");
  const listing = { folders: [], truncated: true, items: [{ id: "11111111-1111-4111-8111-111111111111", reference, name: "API_KEY", description: "", folder: null, envName: "API_KEY", revealableBy: [], revealableByCount: 0, envNameNeedsReview: false }] };
  const client = { callTool: async () => ({ content: [{ type: "text", text: JSON.stringify(listing) }] }) } as unknown as Parameters<typeof runVaultCommand>[0];
  await assert.rejects(runVaultCommand(client, { action: "schema" }, false), (error: unknown) =>
    error instanceof Error && /only part of the Vault/.test(error.message) && (error as { exitCode?: number }).exitCode === 3);
});

test("schema output follows cursors across pages", async () => {
  const { runVaultCommand } = await import("../src/vault/command.js");
  const secretAt = (id: string, name: string) => ({ id, reference: `secret://${id}`, name, description: "", folder: null, envName: name, revealableBy: [], revealableByCount: 0, envNameNeedsReview: false });
  const pages: Record<string, object> = {
    first: { folders: [], items: [secretAt("11111111-1111-4111-8111-111111111111", "FIRST_KEY")], truncated: true, nextCursor: "page-2" },
    "page-2": { folders: [], items: [secretAt("22222222-2222-4222-8222-222222222222", "SECOND_KEY")], truncated: false, nextCursor: null },
  };
  const cursors: Array<string | undefined> = [];
  const client = {
    callTool: async ({ arguments: args }: { arguments: Record<string, string> }) => {
      cursors.push(args.cursor);
      return { content: [{ type: "text", text: JSON.stringify(pages[args.cursor ?? "first"]) }] };
    },
  } as unknown as Parameters<typeof runVaultCommand>[0];
  const written: string[] = [];
  const write = process.stdout.write;
  process.stdout.write = ((chunk: string) => { written.push(String(chunk)); return true; }) as typeof process.stdout.write;
  try {
    await runVaultCommand(client, { action: "schema" }, false);
  } finally {
    process.stdout.write = write;
  }
  assert.deepEqual(cursors, [undefined, "page-2"]);
  assert.match(written.join(""), /FIRST_KEY=strap\(/);
  assert.match(written.join(""), /SECOND_KEY=strap\(/);
});

test("folder output warns when Strap listed only the first folders", async () => {
  const { runVaultCommand } = await import("../src/vault/command.js");
  const listing = { folders: [{ id: "33333333-3333-4333-8333-333333333333", name: "ci", description: "", itemCount: 1 }], items: [], truncated: false, nextCursor: null, foldersTruncated: true };
  const client = { callTool: async () => ({ content: [{ type: "text", text: JSON.stringify(listing) }] }) } as unknown as Parameters<typeof runVaultCommand>[0];
  const errors: string[] = [];
  const write = { out: process.stdout.write, err: process.stderr.write };
  process.stdout.write = (() => true) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string) => { errors.push(String(chunk)); return true; }) as typeof process.stderr.write;
  try {
    await runVaultCommand(client, { action: "folders" }, true);
  } finally {
    process.stdout.write = write.out;
    process.stderr.write = write.err;
  }
  assert.match(errors.join(""), /listed only the first folders/);
  // More secret pages do not make the folder list partial.
  const paged = { ...listing, truncated: true, nextCursor: "page-2", foldersTruncated: false };
  const pagedClient = { callTool: async () => ({ content: [{ type: "text", text: JSON.stringify(paged) }] }) } as unknown as Parameters<typeof runVaultCommand>[0];
  const pagedErrors: string[] = [];
  process.stdout.write = (() => true) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string) => { pagedErrors.push(String(chunk)); return true; }) as typeof process.stderr.write;
  try {
    await runVaultCommand(pagedClient, { action: "folders" }, true);
  } finally {
    process.stdout.write = write.out;
    process.stderr.write = write.err;
  }
  assert.equal(pagedErrors.join(""), "");
});

test("vault commands accept only their own options", () => {
  assert.deepEqual(parseVaultCommand(["folders"]), { action: "folders" });
  assert.deepEqual(parseVaultCommand(["list", "--folder", "share-artifact", "--query", "server"]), { action: "list", folder: "share-artifact", query: "server" });
  assert.deepEqual(parseVaultCommand(["schema", "--folder", "ci", "--instance", "company"]), { action: "schema", folder: "ci", instance: "company" });
  for (const args of [
    [], ["reveal"], ["folders", "--folder", "x"], ["list", "--instance", "company"], ["list", "--folder"],
    ["list", "--folder", "a", "--folder", "b"], ["schema", "--instance", "bad id"], ["list", "stray"],
  ]) {
    assert.throws(() => parseVaultCommand(args), { exitCode: 2 }, args.join(" "));
  }
});

test("suggested variable names follow env conventions", () => {
  assert.equal(vaultEnvName("SHARE_ARTIFACT_SERVER"), "SHARE_ARTIFACT_SERVER");
  assert.equal(vaultEnvName("Deployment API"), "DEPLOYMENT_API");
  assert.equal(vaultEnvName("openAiKey"), "OPEN_AI_KEY");
  assert.equal(vaultEnvName("  stripe / live-key "), "STRIPE_LIVE_KEY");
  assert.equal(vaultEnvName("1password token"), "_1PASSWORD_TOKEN");
  assert.equal(vaultEnvName("***"), "SECRET");
});

test("queries match word prefixes in names and descriptions", () => {
  const item = { name: "SHARE_ARTIFACT_SERVER", description: "Upload host for shareable HTML artifacts" };
  assert.equal(matchesVaultQuery(item, "share artifact"), true);
  assert.equal(matchesVaultQuery(item, "upload"), true);
  assert.equal(matchesVaultQuery(item, "Artifact-Server"), true);
  assert.equal(matchesVaultQuery(item, "stripe"), false);
  assert.equal(matchesVaultQuery(item, "   "), true);
});

test("schema output uses references, optional instances and rejects name collisions", () => {
  const entries = [{ name: "SHARE_ARTIFACT_SERVER", envName: "SHARE_ARTIFACT_SERVER", reference, needsReview: false }];
  assert.equal(
    formatVaultSchema(entries, { heading: "Strap Vault, folder share-artifact" }),
    `# Strap Vault, folder share-artifact\n# @sensitive @required\nSHARE_ARTIFACT_SERVER=strap("${reference}")\n`,
  );
  assert.match(formatVaultSchema(entries, { instance: "company" }), /=strap\(company, "secret:\/\/[0-9a-f-]{36}"\)\n$/);
  assert.throws(() => formatVaultSchema(entries, { instance: "company\"); evil(" }), /Instance ids/);
  assert.throws(
    () => formatVaultSchema([...entries, { name: "share artifact server", envName: "SHARE_ARTIFACT_SERVER", reference, needsReview: false }]),
    /would both become SHARE_ARTIFACT_SERVER/,
  );
});

test("schema output never turns free text into active schema lines", () => {
  const entries = [{ name: "SHARE_ARTIFACT_SERVER", envName: "SHARE_ARTIFACT_SERVER", reference, needsReview: false }];
  const output = formatVaultSchema(entries, { heading: "Strap Vault, folder prod\nINJECTED=value\r\nOTHER=x\u0000" });
  const active = output.split("\n").filter((line) => line && !line.startsWith("#"));
  assert.deepEqual(active, [`SHARE_ARTIFACT_SERVER=strap("${reference}")`]);
  assert.equal(output.includes("\u0000"), false);
  const c1 = formatVaultSchema(entries, { heading: "Strap Vault, folder \u009b2J\u009d52;c;ZXZpbA==\u009c\u0085X=1\u007f" });
  assert.equal(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/.test(c1), false);
  assert.equal(c1.split("\n")[0], "# Strap Vault, folder  2J 52;c;ZXZpbA==  X=1");
  assert.throws(() => formatVaultSchema([{ name: "x", envName: "BAD\nNAME", reference, needsReview: false }]), /Invalid variable name/);
  assert.throws(() => formatVaultSchema([{ name: "x", envName: "OK", reference: `${reference}")\nX=("`, needsReview: false }]), /Invalid variable name or secret reference/);
});

test("terminal output neutralizes escape sequences from Vault metadata", () => {
  const osc52 = "Deploy\u001b]52;c;ZXZpbA==\u0007 key";
  const csi = "Name\u009b31mred\nFAKE ENTRY";
  assert.equal(terminalText(osc52), "Deploy?]52;c;ZXZpbA==? key");
  assert.equal(terminalText(csi), "Name?31mred?FAKE ENTRY");
  assert.equal(terminalText("Plain name, één 🔑"), "Plain name, één 🔑");
  assert.throws(
    () => formatVaultSchema([
      { name: "A\u001b[2J", envName: "SAME", reference: "secret://11111111-1111-4111-8111-111111111111", needsReview: false },
      { name: "B", envName: "SAME", reference: "secret://22222222-2222-4222-8222-222222222222", needsReview: false },
    ]),
    (error: unknown) => error instanceof Error && !error.message.includes("\u001b"),
  );
});

test("queries keep non-ASCII words instead of dropping them", () => {
  assert.equal(matchesVaultQuery({ name: "Cloud token", description: "" }, "clé"), false);
  assert.equal(matchesVaultQuery({ name: "clé API", description: "" }, "clé"), true);
  assert.equal(matchesVaultQuery({ name: "Deploy key", description: "" }, "秘密"), false);
  assert.equal(matchesVaultQuery({ name: "秘密キー", description: "" }, "秘密"), true);
  assert.equal(matchesVaultQuery({ name: "ÜberToken", description: "" }, "über token"), true);
});

test("CLI error output strips escape sequences but keeps usage line breaks", async () => {
  const { errorMessage } = await import("../src/errors.js");
  const echoed = new Error("MCP error -32000: Folder not found. Available folders: \"evil\u009d52;c;ZXZpbA==\u009c\", \"x\u001b[2Jy\".");
  assert.equal(/[\u001b\u0080-\u009f]/.test(errorMessage(echoed)), false);
  assert.equal(errorMessage(new Error("Usage: strap vault folders\n       strap vault list\tok")), "Usage: strap vault folders\n       strap vault list\tok");
});

test("generic tool output escapes C1 controls in JSON and sanitizes plain text", async () => {
  const { terminalJson, terminalPlainText } = await import("../src/terminal/output.js");
  const value = { name: "evil\u009d52;c;ZXZpbA==\u009c", note: "del\u007f", esc: "\u001b[2J" };
  const json = terminalJson(value);
  assert.equal(/[\u001b\u007f-\u009f]/.test(json), false);
  assert.deepEqual(JSON.parse(json), value);
  assert.equal(terminalPlainText("line one\n\tline two\u001b]52;c;x\u0007\u009b"), "line one\n\tline two?]52;c;x??");
});

test("process-control variable names are never generated", async () => {
  const { isProcessControlEnvName } = await import("../src/vault/schema.js");
  for (const name of ["NODE_OPTIONS", "PATH", "LD_PRELOAD", "DYLD_INSERT_LIBRARIES", "NPM_CONFIG_SCRIPT_SHELL", "HTTPS_PROXY", "STRAP_API_KEY", "path"]) {
    assert.equal(isProcessControlEnvName(name), true, name);
  }
  for (const name of ["SHARE_ARTIFACT_SERVER", "DATABASE_URL", "PATHWAY_TOKEN", "GITHUB_TOKEN"]) {
    assert.equal(isProcessControlEnvName(name), false, name);
  }
  assert.equal(vaultEnvName("node options"), "NODE_OPTIONS");
  assert.throws(() => formatVaultSchema([{ name: "node options", envName: "NODE_OPTIONS", reference, needsReview: false }]), /NODE_OPTIONS controls how programs start/);
});

test("names another manager may have chosen are printed commented out", async () => {
  const { isProcessControlEnvName } = await import("../src/vault/schema.js");
  for (const name of ["GIT_EXTERNAL_DIFF", "NODE_ENV", "DOCKER_HOST", "KUBECONFIG", "COMPOSE_FILE", "AWS_ENDPOINT_URL"]) {
    assert.equal(isProcessControlEnvName(name), true, name);
  }
  const output = formatVaultSchema([
    { name: "Deployment API", envName: "DEPLOYMENT_API", reference, needsReview: true },
    { name: "Stripe key", envName: "STRIPE_KEY", reference: "secret://22222222-2222-4222-8222-222222222222", needsReview: false },
  ]);
  const active = output.split("\n").filter((line) => line && !line.startsWith("#"));
  assert.deepEqual(active, ['STRIPE_KEY=strap("secret://22222222-2222-4222-8222-222222222222")']);
  assert.match(output, /# Review DEPLOYMENT_API before enabling: another manager may have named this secret\./);
  assert.match(output, new RegExp(`# DEPLOYMENT_API=strap\\("${reference}"\\)`));
  // Reserved names are refused even when the user named them.
  assert.throws(() => formatVaultSchema([{ name: "docker host", envName: "DOCKER_HOST", reference, needsReview: false }]), /DOCKER_HOST controls how programs start/);
});
