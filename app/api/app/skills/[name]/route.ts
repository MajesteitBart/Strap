import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getSkill, publishSkill } from "@/lib/skills";
import {
  readSkillBody,
  SKILL_NO_STORE,
  skillHttpError,
} from "@/lib/skills-http";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ name: string }> };

export async function GET(request: Request, context: Context) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  try {
    const params = new URL(request.url).searchParams;
    return NextResponse.json(
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
  if (auth instanceof NextResponse) return auth;
  const limit = checkRateLimit({
    scope: "skill-publish",
    identifier: auth.user.id,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.ok)
    return NextResponse.json(
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
    return NextResponse.json(
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
