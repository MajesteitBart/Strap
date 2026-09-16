import { getDatabase } from "@/lib/db/client";
import { readAvatar } from "@/lib/db/repositories/avatars";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if ((kind !== "personal" && kind !== "company") || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id)) return new Response(null, { status: 404 });
  const image = await readAvatar(getDatabase(), kind, id);
  const version = new URL(request.url).searchParams.get("v");
  if (!image || (version && version !== image.hash)) return new Response(null, { status: 404 });
  const headers = { "Content-Type": image.contentType, "X-Content-Type-Options": "nosniff", "Cache-Control": version ? "public, max-age=31536000, immutable" : "public, max-age=60", ETag: `"${image.hash}"` };
  if (request.headers.get("if-none-match") === headers.ETag) return new Response(null, { status: 304, headers });
  return new Response(new Uint8Array(image.body), { headers });
}
