import assert from "node:assert/strict";
import test from "node:test";
import { parseVaultCommand } from "../src/vault/command.js";
import { formatVaultSchema, matchesVaultQuery, vaultEnvName } from "../src/vault/schema.js";

const reference = "secret://11111111-1111-4111-8111-111111111111";

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
  const entries = [{ name: "SHARE_ARTIFACT_SERVER", envName: "SHARE_ARTIFACT_SERVER", reference }];
  assert.equal(
    formatVaultSchema(entries, { heading: "Strap Vault, folder share-artifact" }),
    `# Strap Vault, folder share-artifact\n# @sensitive @required\nSHARE_ARTIFACT_SERVER=strap("${reference}")\n`,
  );
  assert.match(formatVaultSchema(entries, { instance: "company" }), /=strap\(company, "secret:\/\/[0-9a-f-]{36}"\)\n$/);
  assert.throws(() => formatVaultSchema(entries, { instance: "company\"); evil(" }), /Instance ids/);
  assert.throws(
    () => formatVaultSchema([...entries, { name: "share artifact server", envName: "SHARE_ARTIFACT_SERVER", reference }]),
    /would both become SHARE_ARTIFACT_SERVER/,
  );
});

test("schema output never turns free text into active schema lines", () => {
  const entries = [{ name: "SHARE_ARTIFACT_SERVER", envName: "SHARE_ARTIFACT_SERVER", reference }];
  const output = formatVaultSchema(entries, { heading: "Strap Vault, folder prod\nINJECTED=value\r\nOTHER=x\u0000" });
  const active = output.split("\n").filter((line) => line && !line.startsWith("#"));
  assert.deepEqual(active, [`SHARE_ARTIFACT_SERVER=strap("${reference}")`]);
  assert.equal(output.includes("\u0000"), false);
  assert.throws(() => formatVaultSchema([{ name: "x", envName: "BAD\nNAME", reference }]), /Invalid variable name/);
  assert.throws(() => formatVaultSchema([{ name: "x", envName: "OK", reference: `${reference}")\nX=("` }]), /Invalid variable name or secret reference/);
});
