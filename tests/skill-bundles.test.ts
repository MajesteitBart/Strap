import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalSkillContent,
  encodeSkillFile,
  fileBytes,
  validateSkillBundle,
  validateSkillPath,
} from "../packages/strap/src/skills/bundle.ts";
import {
  canPublishSkills,
  skillToolsFor,
  skillReadPayload,
} from "../lib/skill-tools.ts";

const main = (
  content = "---\nname: review-code\ndescription: >-\n  Review changes before merging.\n  Use for pull requests.\n---\n\nRead the changed files.\n",
) => ({ path: "SKILL.md", content, encoding: "utf8", executable: false });

test("standard folded YAML descriptions and binary assets survive the portable format", () => {
  const asset = encodeSkillFile(
    "assets/sample.bin",
    new Uint8Array([0, 255, 128, 12]),
  );
  const bundle = validateSkillBundle({ files: [asset, main()] });
  assert.equal(
    bundle.description,
    "Review changes before merging. Use for pull requests.",
  );
  assert.deepEqual([...fileBytes(bundle.files[1]!)], [0, 255, 128, 12]);
  assert.equal(
    canonicalSkillContent(bundle),
    canonicalSkillContent(validateSkillBundle({ files: [main(), asset] })),
  );
});

test("unsafe paths, YAML aliases, duplicate keys, file/folder collisions, and size bombs fail closed", () => {
  for (const path of [
    "../escape",
    "/absolute",
    "C:/escape",
    "scripts/../../escape",
    "a\\b",
    ".env.local",
    "a/.git/config",
    "CON.txt",
    "file:stream",
    "a. ",
    "node_modules/a",
  ])
    assert.throws(() => validateSkillPath(path), path);
  assert.throws(
    () =>
      validateSkillBundle({ files: [main(), { ...main(), path: "skill.md" }] }),
    /Duplicate/,
  );
  assert.throws(
    () =>
      validateSkillBundle({
        files: [
          main(),
          { ...main(), path: "references" },
          { ...main(), path: "references/a.md" },
        ],
      }),
    /both a file/,
  );
  assert.throws(
    () =>
      validateSkillBundle({
        files: [main("---\nname: safe\nname: other\ndescription: test\n---\n")],
      }),
    /YAML/,
  );
  assert.throws(
    () =>
      validateSkillBundle({
        files: [
          main(
            "---\nname: safe\ndescription: &x test\nmetadata: {a: *x}\n---\n",
          ),
        ],
      }),
    /aliases/,
  );
  assert.throws(
    () => validateSkillBundle({ files: [main("x".repeat(600_000))] }),
    /512 KiB/,
  );
  assert.throws(
    () => validateSkillBundle({ name: "other", files: [main()] }),
    /match/,
  );
});

test("skill write discovery respects profile grant mode and Company administration", () => {
  for (const mode of ["read-only", "proposal-only"])
    for (const role of ["owner", "admin", "member"])
      assert.equal(canPublishSkills(mode, role), false);
  assert.equal(canPublishSkills("direct", "member"), false);
  assert.equal(canPublishSkills("direct", "owner"), true);
  assert.equal(canPublishSkills("direct", "admin"), true);
  assert.deepEqual(skillToolsFor(undefined, "direct", "owner"), []);
  assert.equal(
    skillToolsFor("profile", "read-only", "owner").some((tool) =>
      tool.name.includes("publish"),
    ),
    false,
  );
  assert.equal(skillToolsFor("profile", "direct", "owner").length, 4);
});

test("mixed-case parent directories cannot diverge after a Windows sync", () => {
  assert.throws(
    () =>
      validateSkillBundle({
        files: [
          main(),
          { ...main(), path: "references/a.md" },
          { ...main(), path: "References/b.md" },
        ],
      }),
    /consistent.*casing/,
  );
});

test("agent clients that fill an optional file path still receive instructions and a bounded manifest", () => {
  const bundle = validateSkillBundle({
    files: [
      main(),
      encodeSkillFile("assets/sample.bin", new Uint8Array([0, 255])),
    ],
  });
  const skill = {
    ...bundle,
    id: "test",
    strapId: "profile",
    revision: 1,
    digest: "a".repeat(64),
    fileCount: 2,
    byteCount: 200,
    updatedAt: "2026-09-13",
    archived: false,
  };
  for (const path of [undefined, "", null]) {
    const payload = skillReadPayload(skill, path);
    assert.ok(payload && "instructions" in payload);
    assert.match(payload.instructions ?? "", /Read the changed files/);
    assert.equal(payload.files.length, 2);
    assert.equal(JSON.stringify(payload.files).includes("AP8="), false);
  }
  const binary = skillReadPayload(skill, "assets/sample.bin");
  assert.ok(binary && "file" in binary);
  assert.equal(binary.file.content, "AP8=");
  assert.equal(skillReadPayload(skill, "missing.md"), null);
});
