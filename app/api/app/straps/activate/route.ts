import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { setActiveStrap } from "@/lib/strap-context";

// POST /api/app/straps/activate { strapId } - switch the active Strap.
// Validates membership before setting the cookie; a non-member gets 403 so a
// stale or forged id cannot switch context into a Strap the user left.
export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const creedId =
    body && typeof body === "object"
      ? "strapId" in body
        ? (body as { strapId: unknown }).strapId
        : "creedId" in body
          ? (body as { creedId: unknown }).creedId
          : null
      : null;
  if (typeof creedId !== "string" || creedId.length === 0) {
    return NextResponse.json({ error: "strapId is required." }, { status: 400 });
  }

  const role = await setActiveStrap(auth.supabase, auth.user, creedId);
  if (!role) {
    return NextResponse.json(
      { error: "You are not a member of that Strap." },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true, strapId: creedId, creedId, role });
}
