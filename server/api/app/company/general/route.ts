import { requireApiAuth } from "@/lib/api-auth";
import { updateCompanyGeneral } from "@/lib/company-admin";
import { readStrapId } from "@/lib/strap-api";

// POST /api/app/company/general { creedId, name?, email? } - update the company's
// name and/or shared contact email (owner/admin). Fields are independent so the
// settings screen can save each on blur.
export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;
  const b = (await request.json().catch(() => ({}))) as {
    strapId?: unknown;
    creedId?: unknown;
    name?: unknown;
    email?: unknown;
  };
  const strapId = readStrapId(b);
  if (!strapId) {
    return Response.json({ error: "strapId is required." }, { status: 400 });
  }
  if (b.name !== undefined && typeof b.name !== "string") {
    return Response.json({ error: "Invalid name." }, { status: 400 });
  }
  if (b.email !== undefined && typeof b.email !== "string") {
    return Response.json({ error: "Invalid email." }, { status: 400 });
  }
  const result = await updateCompanyGeneral({
    creedId: strapId,
    actor: auth.user,
    name: typeof b.name === "string" ? b.name : undefined,
    email: typeof b.email === "string" ? b.email : undefined,
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ ok: true });
}
