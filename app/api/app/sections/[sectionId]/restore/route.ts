import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { restoreSectionVersion } from "@/lib/company-sections";
import { readStrapId } from "@/lib/strap-api";

type Ctx = { params: Promise<{ sectionId: string }> };

// POST /api/app/sections/[sectionId]/restore { creedId, versionId } - write a
// stored version back as a new revision (history is never destroyed). Company
// owner/admin only (enforced in the lib); backs the History sheet's Restore.
export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { sectionId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as {
    strapId?: unknown;
    creedId?: unknown;
    versionId?: unknown;
  };
  const strapId = readStrapId(b);
  if (!strapId || typeof b.versionId !== "number") {
    return NextResponse.json(
      { error: "strapId and versionId are required." },
      { status: 400 },
    );
  }

  const result = await restoreSectionVersion({
    creedId: strapId,
    user: auth.user,
    sectionId,
    versionId: b.versionId,
  });
  if (!result.ok) {
    const status =
      result.code === "forbidden" ? 403 : result.code === "not_found" ? 404 : 400;
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status },
    );
  }
  return NextResponse.json(result);
}
