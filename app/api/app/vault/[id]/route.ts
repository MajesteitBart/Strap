import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import {
  deleteVaultItem,
  revealVaultItem,
  updateVaultItem,
  VaultAccessError,
} from "@/lib/api-key-vault";
import { parseVaultFolderId } from "@/lib/vault-grants";

type Context = { params: Promise<{ id: string }> };
const NO_STORE = { "Cache-Control": "no-store" } as const;

function vaultError(error: unknown) {
  if (error instanceof VaultAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: NO_STORE });
  }
  return NextResponse.json({ error: "Vault operation failed." }, { status: 500, headers: NO_STORE });
}

export async function GET(request: Request, context: Context) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  try {
    return NextResponse.json(
      await revealVaultItem({ userId: auth.user.id, itemId: id, request }),
      { headers: NO_STORE },
    );
  } catch (error) {
    return vaultError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const secret = body.secret === null || body.secret === undefined
    ? null
    : typeof body.secret === "string" ? body.secret : "";
  // Absent keeps the current folder; null moves the item out of its folder.
  const folderId = parseVaultFolderId(body.folderId);
  if (!name || name.length > 120 || description.length > 500 || secret === "" || (secret?.length ?? 0) > 16_384 || folderId === false) {
    return NextResponse.json({ error: "Valid name, description, optional replacement secret, and optional folderId are required." }, { status: 400, headers: NO_STORE });
  }
  try {
    return NextResponse.json(
      { item: await updateVaultItem({ userId: auth.user.id, itemId: id, name, description, secret, folderId, request }) },
      { headers: NO_STORE },
    );
  } catch (error) {
    return vaultError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  try {
    await deleteVaultItem({ userId: auth.user.id, itemId: id, request });
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return vaultError(error);
  }
}
