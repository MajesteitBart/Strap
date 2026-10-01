import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { VaultAccessError } from "@/lib/api-key-vault";
import { revokeHeadlessAccessKey, updateHeadlessKeyGrants } from "@/lib/headless-access";
import { recordAuditEvent } from "@/lib/audit-log";

type Context = { params: Promise<{ id: string }> };
const NO_STORE = { "Cache-Control": "no-store" } as const;

/** Replaces the key's Vault grants. Both lists are required so a partial body cannot silently clear one. */
export async function PATCH(request: Request, context: Context) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  const payload: unknown = await request.json().catch(() => null);
  if (!id || !payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Expected an object." }, { status: 400, headers: NO_STORE });
  }
  const body = payload as Record<string, unknown>;
  if (!Array.isArray(body.vaultItemIds) || !Array.isArray(body.vaultFolderIds)) {
    return NextResponse.json({ error: "vaultItemIds and vaultFolderIds are required arrays." }, { status: 400, headers: NO_STORE });
  }
  try {
    const updated = await updateHeadlessKeyGrants({
      userId: auth.user.id,
      keyId: id,
      vaultItemIds: body.vaultItemIds,
      vaultFolderIds: body.vaultFolderIds,
    });
    if (!updated) return NextResponse.json({ error: "Key not found." }, { status: 404, headers: NO_STORE });
    void recordAuditEvent({
      userId: auth.user.id,
      action: "headless.key_grants_updated",
      metadata: {
        keyId: id,
        creedId: updated.metadata.creedId,
        previousVaultItemIds: updated.previous.vaultItemIds,
        previousVaultFolderIds: updated.previous.vaultFolderIds,
        vaultItemIds: updated.metadata.vaultItemIds,
        vaultFolderIds: updated.metadata.vaultFolderIds,
      },
      request,
    });
    return NextResponse.json({ metadata: updated.metadata }, { headers: NO_STORE });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof VaultAccessError ? error.message : "Could not update API key." },
      { status: error instanceof VaultAccessError ? error.status : 500, headers: NO_STORE },
    );
  }
}

export async function DELETE(request: Request, context: Context) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Key id is required." }, { status: 400 });
  const revoked = await revokeHeadlessAccessKey({ userId: auth.user.id, keyId: id });
  if (!revoked) return NextResponse.json({ error: "Key not found." }, { status: 404 });
  void recordAuditEvent({
    userId: auth.user.id,
    action: "headless.key_revoked",
    metadata: { keyId: id },
    request,
  });
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
