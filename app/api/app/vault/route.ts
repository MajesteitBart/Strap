import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { createVaultItem, listVaultItems, VaultAccessError } from "@/lib/api-key-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" } as const;

function vaultError(error: unknown) {
  if (error instanceof VaultAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: NO_STORE });
  }
  return NextResponse.json({ error: "Vault operation failed." }, { status: 500, headers: NO_STORE });
}

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const creedId = new URL(request.url).searchParams.get("creedId")?.trim();
  if (!creedId) return NextResponse.json({ error: "creedId is required." }, { status: 400 });
  try {
    return NextResponse.json(
      { items: await listVaultItems(auth.user.id, creedId) },
      { headers: NO_STORE },
    );
  } catch (error) {
    return vaultError(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const creedId = typeof body.creedId === "string" ? body.creedId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const secret = typeof body.secret === "string" ? body.secret : "";
  if (!creedId || !name || name.length > 120 || description.length > 500 || !secret || secret.length > 16_384) {
    return NextResponse.json({ error: "Valid creedId, name, description, and secret are required." }, { status: 400, headers: NO_STORE });
  }
  try {
    const item = await createVaultItem({
      userId: auth.user.id,
      creedId,
      name,
      description,
      secret,
      request,
    });
    return NextResponse.json({ item }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return vaultError(error);
  }
}
