import * as tables from "@/db/schema/application";
import { requireApiAuth } from "@/lib/api-auth";
import { query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import { revokeOAuthTokensForUser } from "@/lib/oauth";
import { inferAgentIconKind } from "@/lib/strap-backend";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

// Disconnects one agent: revokes its OAuth tokens and clears its roster rows so
// the connections screen flips the card back to "Not connected". Cards are
// keyed by brand icon while tokens are keyed by OAuth client_id, so both are
// matched the same way the UI matches them - by the icon their client name
// resolves to.
export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => ({}))) as { icon?: string };
  const icon = typeof body.icon === "string" ? body.icon.trim() : "";
  if (!icon) {
    return NextResponse.json({ error: "Missing agent icon." }, { status: 400 });
  }

  const admin = serviceContext("app/api/app/mcp/revoke/route.ts");

  // Revoke OAuth tokens whose registered client name resolves to this icon.
  const { data: tokenRows, error: tokenError } = await query(admin, tables.oauth_tokens, "select", (database, scope) => database.select({ client_id: tables.oauth_tokens.client_id }).from(tables.oauth_tokens).where(and(scope, eq(tables.oauth_tokens.user_id, auth.user.id), isNull(tables.oauth_tokens.revoked_at))));
  if (tokenError) {
    return NextResponse.json({ error: "Could not load tokens." }, { status: 500 });
  }
  const clientIds = [
    ...new Set(
      ((tokenRows as { client_id: string }[] | null) ?? []).map((row) => row.client_id),
    ),
  ];
  if (clientIds.length > 0) {
    const { data: oauthClients, error: clientError } = await query(admin, tables.oauth_clients, "select", (database, scope) => database.select({ client_id: tables.oauth_clients.client_id, client_name: tables.oauth_clients.client_name }).from(tables.oauth_clients).where(and(scope, inArray(tables.oauth_clients.client_id, clientIds))));
    if (clientError) {
      return NextResponse.json({ error: "Could not load clients." }, { status: 500 });
    }
    const clientRows =
      (oauthClients as { client_id: string; client_name: string }[] | null) ?? [];
    for (const client of clientRows) {
      if (inferAgentIconKind(client.client_name) === icon) {
        await revokeOAuthTokensForUser(auth.user.id, client.client_id);
      }
    }
  }

  // Clear matching roster rows so connected/last-seen status resets. The
  // roster's client_name is the MCP clientInfo name, which resolves through
  // the same alias table as the card icons.
  const { data: rosterRows, error: rosterError } = await query(admin, tables.creed_mcp_clients, "select", (database, scope) => database.select({ client_id: tables.creed_mcp_clients.client_id, client_name: tables.creed_mcp_clients.client_name }).from(tables.creed_mcp_clients).where(and(scope, eq(tables.creed_mcp_clients.user_id, auth.user.id))));
  if (rosterError) {
    return NextResponse.json({ error: "Could not load MCP clients." }, { status: 500 });
  }
  const rosterIds = (
    (rosterRows as { client_id: string; client_name: string }[] | null) ?? []
  )
    .filter((row) => inferAgentIconKind(row.client_name) === icon)
    .map((row) => row.client_id);
  if (rosterIds.length > 0) {
    const { error: deleteError } = await query(admin, tables.creed_mcp_clients, "delete", (database, scope) => database.delete(tables.creed_mcp_clients).where(and(scope, eq(tables.creed_mcp_clients.user_id, auth.user.id), inArray(tables.creed_mcp_clients.client_id, rosterIds))));
    if (deleteError) {
      return NextResponse.json({ error: "Could not disconnect agent." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, revokedClients: rosterIds.length });
}
