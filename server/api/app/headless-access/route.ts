import { requireApiAuth } from "@/lib/api-auth";
import { recordAuditEvent } from "@/lib/audit-log";
import {
  createHeadlessAccessKey,
  listHeadlessKeys,
} from "@/lib/headless-access";
import { isHeadlessKeyMode, parseOptionalExpiry } from "@/lib/headless-access-shared";
import { VaultAccessError } from "@/lib/api-key-vault";
import { parseVaultFolderGrants, parseVaultItemGrants } from "@/lib/vault-grants";
import { getCreedRole } from "@/lib/strap-membership";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;
  const params = new URL(request.url).searchParams;
  const creedId =
    params.get("strapId")?.trim() || params.get("creedId")?.trim();
  if (!creedId) {
    return Response.json({ error: "strapId is required." }, { status: 400 });
  }
  if (!(await getCreedRole(auth.context, auth.user.id, creedId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const keys = await listHeadlessKeys(auth.user.id, creedId);
  return Response.json({ keys }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;
  const payload: unknown = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return Response.json({ error: "Expected an object." }, { status: 400, headers: NO_STORE });
  }
  const body = payload as Record<string, unknown>;
  const rawStrapId =
    typeof body.strapId === "string" ? body.strapId : body.creedId;
  const creedId = typeof rawStrapId === "string" ? rawStrapId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const expiresAt = parseOptionalExpiry(body.expiresAt ?? null);
  const vaultItemIds = parseVaultItemGrants(body.vaultItemIds);
  const vaultFolderIds = parseVaultFolderGrants(body.vaultFolderIds);
  if (!creedId || !name || name.length > 120 || !isHeadlessKeyMode(body.mode) || expiresAt === undefined || !vaultItemIds || !vaultFolderIds) {
    return Response.json(
      { error: "Valid strapId, name, mode, optional future expiresAt, and up to 100 Vault item and 100 folder IDs are required." },
      { status: 400 },
    );
  }
  if (!(await getCreedRole(auth.context, auth.user.id, creedId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const created = await createHeadlessAccessKey({
      userId: auth.user.id,
      creedId,
      name,
      mode: body.mode,
      expiresAt,
      vaultItemIds,
      vaultFolderIds,
    });
    void recordAuditEvent({
      userId: auth.user.id,
      action: "headless.key_created",
      metadata: { keyId: created.metadata.id, creedId, mode: created.metadata.mode, vaultItemIds, vaultFolderIds },
      request,
    });
    return Response.json(created, { status: 201, headers: NO_STORE });
  } catch (error) {
    return Response.json(
      { error: error instanceof VaultAccessError ? error.message : "Could not create API key." },
      { status: error instanceof VaultAccessError ? error.status : 500, headers: NO_STORE },
    );
  }
}
