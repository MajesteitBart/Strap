import { isDatabaseConfigured } from "@/lib/env";
import { NO_STORE_HEADERS } from "@/lib/http-headers";
import { getRequestAuth, getRequestDatabaseContext } from "@/lib/request-auth";
import { resolveOwnedCompanyStrapId } from "@/lib/strap-context";
import { markCompanyWelcomed, markEntitlementWelcomed } from "@/lib/welcome";
import { NextResponse } from "next/server";

// Marks the one-time welcome pop-up as seen for the current user. Called
// (fire-and-forget) whenever the user closes the tour - via the X, Esc,
// overlay click, the final Done button, or an inline link (roadmap/Discord).
// Idempotent: writing welcomed_at again is harmless. Auth-gated; an unauthed
// caller gets 401.
//
// Fails soft: a write error (including welcomed_at not existing yet, before
// the migration runs) still returns 204 because the client also mirrors the
// dismissal to localStorage, so the tour never re-shows on this device even
// if the server write is lost. It is purely cosmetic state.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function POST() {
  if (!isDatabaseConfigured()) {
    return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
  }

  const context = await getRequestDatabaseContext();
  const {
    data: { user },
  } = await getRequestAuth().then(({ user }) => ({ data: { user } }));

  if (!user) {
    return NextResponse.json(
      { error: "Not signed in" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  try {
    // Inside a Company Strap the caller owns, the tour is the company variant,
    // gated on the company billing row - mark that. Otherwise mark the personal
    // entitlement. resolveOwnedCompanyCreedId is null for members and personal
    // Straps, so their path is unchanged.
    const ownedCompanyId = await resolveOwnedCompanyStrapId(context, user);
    if (ownedCompanyId) {
      await markCompanyWelcomed(ownedCompanyId);
    } else {
      await markEntitlementWelcomed(user.id);
    }
  } catch {
    // Swallow: the localStorage mirror covers this device and the next
    // dismiss retries. Never surface an error for a cosmetic write.
  }
  return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
}
