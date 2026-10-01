import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { createVaultFolder, VaultAccessError } from "@/lib/api-key-vault";
import { readJsonObject, readStrapId } from "@/lib/strap-api";
import { isVaultFolderName } from "@/lib/vault-grants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Expected a JSON object." }, { status: 400, headers: NO_STORE });
  const strapId = readStrapId(body) ?? "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!strapId || !isVaultFolderName(name) || description.length > 500) {
    return NextResponse.json({ error: "Valid strapId, a one-line name of up to 120 characters, and description are required." }, { status: 400, headers: NO_STORE });
  }
  try {
    const folder = await createVaultFolder({ userId: auth.user.id, strapId, name, description, request });
    return NextResponse.json({ folder }, { status: 201, headers: NO_STORE });
  } catch (error) {
    if (error instanceof VaultAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: NO_STORE });
    }
    return NextResponse.json({ error: "Vault operation failed." }, { status: 500, headers: NO_STORE });
  }
}
