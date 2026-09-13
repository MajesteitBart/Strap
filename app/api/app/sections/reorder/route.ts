import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { reorderCompanySections } from "@/lib/company-sections";
import { readStrapId } from "@/lib/strap-api";

// POST /api/app/sections/reorder { creedId, sectionIds } - owner/admin reorder
// of a Company Strap's sections. The order persists (section positions) so every
// member picks it up on their next sync. Role is re-checked in the lib.
export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as {
    strapId?: unknown;
    creedId?: unknown;
    sectionIds?: unknown;
  };
  const strapId = readStrapId(b);
  if (
    !strapId ||
    !Array.isArray(b.sectionIds) ||
    !b.sectionIds.every((id) => typeof id === "string")
  ) {
    return NextResponse.json(
      { error: "strapId and sectionIds are required." },
      { status: 400 },
    );
  }

  const result = await reorderCompanySections({
    creedId: strapId,
    user: auth.user,
    sectionIds: b.sectionIds as string[],
  });
  if (!result.ok) {
    const status = result.code === "forbidden" ? 403 : 400;
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status },
    );
  }
  return NextResponse.json({ ok: true });
}
