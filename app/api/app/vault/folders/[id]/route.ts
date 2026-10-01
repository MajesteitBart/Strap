import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { readJsonObject } from "@/lib/strap-api";
import { isVaultFolderName } from "@/lib/vault-grants";
import { deleteVaultFolder, updateVaultFolder, VaultAccessError } from "@/lib/api-key-vault";

type Context = { params: Promise<{ id: string }> };
const NO_STORE = { "Cache-Control": "no-store" } as const;

function vaultError(error: unknown) {
  if (error instanceof VaultAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: NO_STORE });
  }
  return NextResponse.json({ error: "Vault operation failed." }, { status: 500, headers: NO_STORE });
}

export async function PATCH(request: Request, context: Context) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Expected a JSON object." }, { status: 400, headers: NO_STORE });
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!isVaultFolderName(name) || description.length > 500) {
    return NextResponse.json({ error: "A one-line name of up to 120 characters and a valid description are required." }, { status: 400, headers: NO_STORE });
  }
  try {
    return NextResponse.json(
      { folder: await updateVaultFolder({ userId: auth.user.id, folderId: id, name, description, request }) },
      { headers: NO_STORE },
    );
  } catch (error) {
    return vaultError(error);
  }
}

/** Items in the folder stay in the Vault without a folder. */
export async function DELETE(request: Request, context: Context) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  try {
    return NextResponse.json({ ok: true, ...await deleteVaultFolder({ userId: auth.user.id, folderId: id, request }) }, { headers: NO_STORE });
  } catch (error) {
    return vaultError(error);
  }
}
