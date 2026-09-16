import { users } from "@/db/schema/auth";
import { requireApiAuth } from "@/lib/api-auth";
import { log } from "@/lib/observability";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  let body: { name?: string };
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = body.name?.trim();

  if (!name || name.length > 200) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  try {
    await auth.context.database.update(users).set({ displayName: name, updatedAt: new Date() }).where(eq(users.id, auth.user.id));
  } catch {
    log.error("profile_update_failed", { userId: auth.user.id });
    return NextResponse.json({ error: "Could not update your profile." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    user: { name, email: auth.user.email },
  });
}
