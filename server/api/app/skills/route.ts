import { requireApiAuth } from "@/lib/api-auth";
import { listSkills } from "@/lib/skills";
import { SKILL_NO_STORE, skillHttpError } from "@/lib/skills-http";

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;
  try {
    return Response.json(
      await listSkills(
        auth.user.id,
        new URL(request.url).searchParams.get("strapId") ?? "",
      ),
      { headers: SKILL_NO_STORE },
    );
  } catch (error) {
    return skillHttpError(error);
  }
}
