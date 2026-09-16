import { callProcedure, type ProcedureName } from "@/lib/db/procedures";
import { serviceContext } from "@/lib/db/service";
import {
  canonicalSkillContent,
  fileBytes,
  validateSkillBundle,
  validateSkillName,
  type SkillSummary,
  type StoredSkill,
} from "@/packages/strap/src/skills/bundle";
import { createHash } from "node:crypto";
import "server-only";

export class SkillError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function validateStrapId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      value,
    )
  )
    throw new SkillError("A valid strapId is required.", 400);
  return value;
}

export function validateRevision(value: unknown): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 0 ||
    Number(value) > 2147483646
  )
    throw new SkillError("A valid baseRevision is required.", 400);
  return Number(value);
}

async function rpc(
  name: ProcedureName,
  args: Record<string, unknown>,
): Promise<unknown> {
  const client = serviceContext("lib/skills.ts");
  const { data, error } = await callProcedure(client, name, args);
  if (error) {
    const status = (
      {
        "42501": 403,
        P0002: 404,
        "PT409": 409,
        "22023": 400,
        "54000": 422,
      } as Record<string, number>
    )[error.code];
    throw new SkillError(
      status ? error.message : "The skill library is unavailable. Try again.",
      status ?? 503,
    );
  }
  return data;
}

export async function listSkills(userId: string, strapId: string) {
  return (await rpc("strap_skills_read", {
    p_user_id: userId,
    p_strap_id: validateStrapId(strapId),
  })) as { strapId: string; canManage: boolean; storageBytes: number; skills: SkillSummary[] };
}

export async function getSkill(
  userId: string,
  strapId: string,
  name: string,
  revision?: number,
) {
  return (await rpc("strap_skills_read", {
    p_user_id: userId,
    p_strap_id: validateStrapId(strapId),
    p_name: validateSkillName(name),
    p_revision: revision === undefined ? null : validateRevision(revision),
  })) as { skill: StoredSkill; versions: SkillSummary[] };
}

export async function publishSkill(
  userId: string,
  strapId: string,
  name: string,
  baseRevision: unknown,
  input: unknown,
  archived = false,
): Promise<StoredSkill> {
  validateStrapId(strapId);
  validateSkillName(name);
  validateRevision(baseRevision);
  let bundle;
  try {
    bundle = input === null && archived ? null : validateSkillBundle(input);
  } catch (error) {
    throw new SkillError(
      error instanceof Error ? error.message : "Invalid skill bundle.",
      400,
    );
  }
  if (bundle && bundle.name !== name)
    throw new SkillError(
      "The name in SKILL.md must match the skill being published.",
      400,
    );
  return (await rpc("strap_skill_publish", {
    p_user_id: userId,
    p_strap_id: strapId,
    p_name: name,
    p_base_revision: baseRevision,
    p_description: bundle?.description ?? null,
    p_files: bundle?.files ?? null,
    p_digest: bundle
      ? createHash("sha256").update(canonicalSkillContent(bundle)).digest("hex")
      : null,
    p_byte_count: bundle
      ? bundle.files.reduce((size, file) => size + fileBytes(file).length, 0)
      : null,
    p_archived: archived,
  })) as StoredSkill;
}
