import { NextResponse } from "next/server";
import { SkillError } from "@/lib/skills";
import { isRecord } from "@/packages/strap/src/skills/bundle";
import { JsonBodyLimitError, readBoundedJson } from "@/lib/bounded-json";

export const SKILL_NO_STORE = { "Cache-Control": "private, no-store" };

export function skillHttpError(error: unknown) {
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : "Skill operation failed.",
    },
    {
      status:
        error instanceof JsonBodyLimitError
          ? 413
          : error instanceof SkillError
            ? error.status
            : 400,
      headers: SKILL_NO_STORE,
    },
  );
}

export async function readSkillBody(
  request: Request,
): Promise<Record<string, unknown>> {
  const body = await readBoundedJson(request, 12 * 1024 * 1024);
  if (!isRecord(body)) throw new SkillError("A JSON object is required.", 400);
  return body;
}
