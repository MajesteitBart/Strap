import { requireApiAuth } from "@/lib/api-auth";
import { getSkill, publishSkill } from "@/lib/skills";
import {
  readSkillBody,
  SKILL_NO_STORE,
  skillHttpError,
} from "@/lib/skills-http";
import { checkRateLimit } from "@/lib/rate-limit";

type Context = { params: Promise<{ name: string }> };

export async function GET(request: Request, context: Context) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;
  try {
    const params = new URL(request.url).searchParams;
    return Response.json(
      await getSkill(
        auth.user.id,
        params.get("strapId") ?? "",
        (await context.params).name,
        params.has("revision") ? Number(params.get("revision")) : undefined,
      ),
      { headers: SKILL_NO_STORE },
    );
  } catch (error) {
    return skillHttpError(error);
  }
}

export async function PUT(request: Request, context: Context) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;
  const limit = checkRateLimit({
    scope: "skill-publish",
    identifier: auth.user.id,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.ok)
    return Response.json(
      { error: "Too many publications. Try again shortly." },
      {
        status: 429,
        headers: {
          ...SKILL_NO_STORE,
          "Retry-After": String(limit.retryAfterSeconds),
        },
      },
    );
  try {
    const body = await readSkillBody(request);
    return Response.json(
      {
        skill: await publishSkill(
          auth.user.id,
          String(body.strapId ?? ""),
          (await context.params).name,
          body.baseRevision,
          body.archived === true ? null : body,
          body.archived === true,
        ),
      },
      { headers: SKILL_NO_STORE },
    );
  } catch (error) {
    return skillHttpError(error);
  }
}
