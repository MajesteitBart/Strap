import { requireApiAuth } from "@/lib/api-auth";
import { createVaultItem, listVaultFolders, listVaultItems, VaultAccessError } from "@/lib/api-key-vault";
import { readJsonObject, readStrapId } from "@/lib/strap-api";
import { parseVaultFolderId } from "@/lib/vault-grants";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function vaultError(error: unknown) {
  if (error instanceof VaultAccessError) {
    return Response.json({ error: error.message }, { status: error.status, headers: NO_STORE });
  }
  return Response.json({ error: "Vault operation failed." }, { status: 500, headers: NO_STORE });
}

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;
  const params = new URL(request.url).searchParams;
  const creedId =
    params.get("strapId")?.trim() || params.get("creedId")?.trim();
  if (!creedId) return Response.json({ error: "strapId is required." }, { status: 400 });
  try {
    const [items, folders] = await Promise.all([
      listVaultItems(auth.user.id, creedId),
      listVaultFolders(auth.user.id, creedId),
    ]);
    return Response.json({ items, folders }, { headers: NO_STORE });
  } catch (error) {
    return vaultError(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;
  const body = await readJsonObject(request);
  if (!body) return Response.json({ error: "Expected a JSON object." }, { status: 400, headers: NO_STORE });
  const creedId = readStrapId(body) ?? "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const secret = typeof body.secret === "string" ? body.secret : "";
  const folderId = parseVaultFolderId(body.folderId);
  if (!creedId || !name || name.length > 120 || description.length > 500 || !secret || secret.length > 16_384 || folderId === false) {
    return Response.json({ error: "Valid strapId, name, description, secret, and optional folderId are required." }, { status: 400, headers: NO_STORE });
  }
  try {
    const item = await createVaultItem({
      userId: auth.user.id,
      creedId,
      name,
      description,
      secret,
      folderId: folderId ?? null,
      request,
    });
    return Response.json({ item }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return vaultError(error);
  }
}
