import { requireApiAuth } from "@/lib/api-auth";
import { AccessDeniedError } from "@/lib/authz/viewer";
import { saveAvatar } from "@/lib/db/repositories/avatars";
import { NextResponse } from "next/server";
export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const form = await request.formData().catch(() => null);
  const scope = form?.get("scope");
  const file = form?.get("file");
  const id = scope === "personal" ? auth.user.id : form?.get("creedId");
  if ((scope !== "personal" && scope !== "company") || !(file instanceof File) || typeof id !== "string" || !id || file.size > 3145728) {
    return NextResponse.json({ error: "Choose a JPG, PNG, WebP, or GIF image smaller than 3 MB." }, { status: 400 });
  }
  try {
    const avatarUrl = await saveAvatar(auth.context.database, { userId: auth.user.id }, scope, id, Buffer.from(await file.arrayBuffer()), file.type);
    return NextResponse.json({ ok: true, avatarUrl });
  } catch (error) {
    return NextResponse.json({ error: error instanceof AccessDeniedError ? "Forbidden" : "Could not save profile picture." }, { status: error instanceof AccessDeniedError ? 403 : 400 });
  }
}
