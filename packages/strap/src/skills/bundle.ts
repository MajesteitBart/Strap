// Portable skill format shared by the CLI, browser editor, and server validator.
import { parseDocument } from "yaml";

export const MAX_SKILL_FILES = 128;
export const MAX_SKILL_BYTES = 2 * 1024 * 1024;
export const MAX_SKILL_FILE_BYTES = 512 * 1024;

export type SkillFile = {
  path: string;
  content: string;
  encoding: "utf8" | "base64";
  executable: boolean;
};
export type SkillBundle = {
  name: string;
  description: string;
  files: SkillFile[];
};
export type SkillSummary = {
  id: string;
  strapId: string;
  name: string;
  description: string;
  revision: number;
  digest: string;
  fileCount: number;
  byteCount: number;
  updatedAt: string;
  archived: boolean;
};
export type StoredSkill = SkillSummary & { files: SkillFile[] };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateSkillName(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 64 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  ) {
    throw new Error(
      "Use a skill name of 1–64 lowercase letters, numbers, and single hyphens.",
    );
  }
  // Windows device names remain reserved even with an extension.
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/.test(value))
    throw new Error("That skill name is reserved by the operating system.");
  return value;
}

export function validateSkillPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 240 ||
    value.split("/").length > 12
  )
    throw new Error("Invalid skill file path.");
  const parts = value.split("/");
  if (
    parts.some(
      (part) =>
        !/^[a-zA-Z0-9_][a-zA-Z0-9_. -]*$/.test(part) ||
        /[. ]$/.test(part) ||
        /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part),
    )
  ) {
    throw new Error(
      "Skill paths must be portable relative paths without hidden folders, traversal, or device names.",
    );
  }
  if (
    parts.some((part) =>
      /^(node_modules|credentials(?:\..*)?|id_(rsa|ed25519)(?:\..*)?)$/i.test(
        part,
      ),
    )
  ) {
    throw new Error("Keep dependencies and credentials outside skill bundles.");
  }
  return value;
}

export function fileBytes(
  file: Pick<SkillFile, "content" | "encoding">,
): Uint8Array {
  if (file.encoding === "utf8") return new TextEncoder().encode(file.content);
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      file.content,
    )
  )
    throw new Error("Invalid base64 skill file.");
  const decoded = atob(file.content);
  if (btoa(decoded) !== file.content)
    throw new Error("Non-canonical base64 skill file.");
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

export function encodeSkillFile(
  path: string,
  bytes: Uint8Array,
  executable = false,
): SkillFile {
  validateSkillPath(path);
  try {
    const content = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    }).decode(bytes);
    // Escaped control bytes can expand sixfold in JSON. Keep the manifest
    // editable, but use base64 for assets when it gives a smaller wire value.
    const textBytes = new TextEncoder().encode(JSON.stringify(content)).length;
    const base64Bytes = 4 * Math.ceil(bytes.length / 3) + 2;
    if (!content.includes("\0") && (path === "SKILL.md" || textBytes <= base64Bytes))
      return { path, content, encoding: "utf8", executable };
  } catch {
    // Invalid UTF-8 is retained losslessly below.
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return { path, content: btoa(binary), encoding: "base64", executable };
}

export function validateSkillBundle(input: unknown): SkillBundle {
  if (
    !isRecord(input) ||
    !Array.isArray(input.files) ||
    input.files.length === 0 ||
    input.files.length > MAX_SKILL_FILES
  ) {
    throw new Error(
      `A skill needs 1–${MAX_SKILL_FILES} files, including SKILL.md.`,
    );
  }
  let total = 0;
  const paths = new Set<string>();
  const casing = new Map<string, string>();
  const files = input.files
    .map((raw): SkillFile => {
      if (
        !isRecord(raw) ||
        typeof raw.content !== "string" ||
        !["utf8", "base64"].includes(String(raw.encoding)) ||
        typeof raw.executable !== "boolean"
      )
        throw new Error("Invalid skill file.");
      const path = validateSkillPath(raw.path);
      const folded = path.toLowerCase();
      if (paths.has(folded))
        throw new Error(
          "Duplicate skill paths, including case-only differences, are not supported.",
        );
      paths.add(folded);
      const segments = path.split("/");
      for (let index = 1; index <= segments.length; index++) {
        const prefix = segments.slice(0, index).join("/");
        const previous = casing.get(prefix.toLowerCase());
        if (previous && previous !== prefix) throw new Error("Use consistent file and folder casing across the skill bundle.");
        casing.set(prefix.toLowerCase(), prefix);
      }
      if (raw.content.length > MAX_SKILL_FILE_BYTES * 2)
        throw new Error("A skill file exceeds 512 KiB.");
      const file: SkillFile = {
        path,
        content: raw.content,
        encoding: raw.encoding as SkillFile["encoding"],
        executable: raw.executable,
      };
      const bytes = fileBytes(file);
      if (bytes.length > MAX_SKILL_FILE_BYTES)
        throw new Error("A skill file exceeds 512 KiB.");
      // UTF-8 text must round-trip, including rejecting lone surrogate code units.
      if (
        file.encoding === "utf8" &&
        new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes) !==
          file.content
      )
        throw new Error("Skill text must be valid UTF-8.");
      total += bytes.length;
      if (total > MAX_SKILL_BYTES)
        throw new Error("The skill bundle exceeds 2 MiB.");
      return encodeSkillFile(path, bytes, file.executable);
    })
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  for (const path of paths) {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++)
      if (paths.has(parts.slice(0, i).join("/")))
        throw new Error("A skill path cannot be both a file and a folder.");
  }
  const main = files.find((file) => file.path === "SKILL.md");
  if (!main || main.encoding !== "utf8")
    throw new Error("Include a UTF-8 SKILL.md file at the root of the skill.");
  const frontmatter = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(
    main.content,
  );
  if (!frontmatter?.[1])
    throw new Error(
      "SKILL.md needs YAML frontmatter with name and description.",
    );
  const document = parseDocument(frontmatter[1], {
    uniqueKeys: true,
    schema: "core",
    prettyErrors: false,
  });
  if (document.errors.length || document.warnings.length)
    throw new Error(
      "SKILL.md frontmatter contains invalid or unsupported YAML.",
    );
  let metadata: unknown;
  try {
    metadata = document.toJS({ maxAliasCount: 0 });
  } catch {
    throw new Error("YAML aliases are not supported in skill metadata.");
  }
  if (!isRecord(metadata))
    throw new Error("SKILL.md frontmatter must be a mapping.");
  const name = validateSkillName(metadata.name);
  const description = metadata.description;
  if (
    typeof description !== "string" ||
    !description.trim() ||
    description.length > 1024
  )
    throw new Error("SKILL.md needs a description of 1–1024 characters.");
  if (input.name !== undefined && input.name !== name)
    throw new Error(
      "The skill name must match SKILL.md frontmatter and its directory name.",
    );
  return { name, description: description.trim(), files };
}

// Hash this representation rather than input JSON property order. No EOL rewriting.
export function canonicalSkillContent(bundle: SkillBundle): string {
  return JSON.stringify(
    bundle.files.map(({ path, content, encoding, executable }) => ({
      path,
      content,
      encoding,
      executable,
    })),
  );
}

export function validateStoredSkill(value: unknown): StoredSkill {
  if (!isRecord(value)) throw new Error("Invalid skill response.");
  const bundle = validateSkillBundle(value);
  if (
    typeof value.id !== "string" ||
    typeof value.strapId !== "string" ||
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 1 ||
    typeof value.digest !== "string" ||
    !/^[a-f0-9]{64}$/.test(value.digest) ||
    typeof value.updatedAt !== "string" ||
    typeof value.archived !== "boolean"
  )
    throw new Error("Invalid skill revision metadata.");
  return {
    ...bundle,
    id: value.id,
    strapId: value.strapId,
    revision: Number(value.revision),
    digest: value.digest,
    updatedAt: value.updatedAt,
    archived: value.archived,
    fileCount: bundle.files.length,
    byteCount: bundle.files.reduce(
      (size, file) => size + fileBytes(file).length,
      0,
    ),
  };
}
