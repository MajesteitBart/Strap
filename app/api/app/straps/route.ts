import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { listUserStraps } from "@/lib/strap-membership";

// GET /api/app/straps - the Strap switcher list for the signed-in user.
// Personal first, then Company Straps. Reads membership under RLS via the
// user's session client.
export async function GET() {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const creeds = await listUserStraps(auth.supabase, auth.user.id);
  const straps = creeds.map((creed) => ({
    ...creed,
    strapId: creed.id,
    creedId: creed.id,
  }));
  return NextResponse.json({ straps, creeds: straps });
}
