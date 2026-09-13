import "server-only";
import { getSkill, listSkills, publishSkill, SkillError } from "@/lib/skills";
import { canPublishSkills, skillReadPayload } from "@/lib/skill-tools";
import { checkRateLimit } from "@/lib/rate-limit";

export async function callSkillTool(
  name: string,
  args: Record<string, unknown>,
  access: { userId: string; strapId?: string; mode: string; role?: string },
) {
  if (!access.strapId)
    throw new SkillError(
      "This connection no longer has access to a skill library.",
      403,
    );
  if (name === "strap_list_skills") {
    const library = await listSkills(access.userId, access.strapId);
    return {
      ...library,
      canManage:
        library.canManage && canPublishSkills(access.mode, access.role),
      skills: library.skills.filter(
        (skill) => args.includeArchived === true || !skill.archived,
      ),
    };
  }
  if (typeof args.name !== "string")
    throw new SkillError("A skill name is required.", 400);
  if (name === "strap_publish_skill") {
    if (!canPublishSkills(access.mode, access.role))
      throw new SkillError(
        "Skill publishing requires direct access and a profile owner or Company admin.",
        403,
      );
    const limit = checkRateLimit({
      scope: "skill-publish",
      identifier: access.userId,
      limit: 20,
      windowMs: 60_000,
    });
    if (!limit.ok)
      throw new SkillError("Too many publications. Try again shortly.", 429);
    return {
      skill: await publishSkill(
        access.userId,
        access.strapId,
        args.name,
        args.baseRevision,
        args,
      ),
    };
  }
  const { skill } = await getSkill(access.userId, access.strapId, args.name);
  if (name === "strap_export_skill") return { skill };
  if (skill.archived)
    throw new SkillError(
      "This skill is archived and should no longer be used.",
      410,
    );
  const payload = skillReadPayload(skill, args.filePath);
  if (!payload)
    throw new SkillError(
      "Skill file not found. Omit filePath to read the instructions and manifest, then use a listed path.",
      404,
    );
  return payload;
}
