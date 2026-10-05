import { requireApiAuth } from "@/lib/api-auth";
import { readJsonObject } from "@/lib/strap-api";
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
    return Response.json({ error: error.message }, { status: error.status, headers: NO_STORE });
  }
  return Response.json({ error: "Vault operation failed." }, { status: 500, headers: NO_STORE });
}

export async function GET(request: Request, context: Context) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;
  const { id } = await context.params;
  try {
    return Response.json(
      await revealVaultItem({ userId: auth.user.id, itemId: id, request }),
      { headers: NO_STORE },
    );
  } catch (error) {
    return vaultError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;
  const { id } = await context.params;
  const body = await readJsonObject(request);
  if (!body) return Response.json({ error: "Expected a JSON object." }, { status: 400, headers: NO_STORE });
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const secret = body.secret === null || body.secret === undefined
    ? null
    : typeof body.secret === "string" ? body.secret : "";
  // Absent keeps the current folder; null moves the item out of its folder.
  const folderId = parseVaultFolderId(body.folderId);
  // A move names the folder the editor saw, so a stale form cannot undo another move.
  const expectedFolderId = parseVaultFolderId(body.expectedFolderId);
  if (!name || name.length > 120 || description.length > 500 || secret === "" || (secret?.length ?? 0) > 16_384 || folderId === false || expectedFolderId === false || (folderId !== undefined && expectedFolderId === undefined)) {
    return Response.json({ error: "Valid name, description, optional replacement secret, and optional folderId with expectedFolderId are required." }, { status: 400, headers: NO_STORE });
  }
  try {
    return Response.json(
      { item: await updateVaultItem({ userId: auth.user.id, itemId: id, name, description, secret, folderId, expectedFolderId, request }) },
      { headers: NO_STORE },
    );
  } catch (error) {
    return vaultError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;
  const { id } = await context.params;
  try {
    await deleteVaultItem({ userId: auth.user.id, itemId: id, request });
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return vaultError(error);
  }
}
