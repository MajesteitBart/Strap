import * as tables from "@/db/schema/application";
import { requireApiAuth } from "@/lib/api-auth";
import { query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import {
  getGrantedClientIds,
  hasActiveConnectionIcon,
} from "@/lib/mcp-connection-status";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

// Live connection check for one agent card: does this agent hold a usable
// (unrevoked, unexpired) OAuth token right now? Matched by brand icon the same
// way the cards and the revoke route match - via the client name's icon.
export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const searchParams = new URL(request.url).searchParams;
  const icon = searchParams.get("icon")?.trim() ?? "";
  const creedId =
    searchParams.get("strapId")?.trim() ??
    searchParams.get("creedId")?.trim() ??
    "";
  if (!icon || !creedId) {
    return NextResponse.json(
      { error: "Missing agent icon or Strap id." },
      { status: 400 },
    );
  }

  const admin = serviceContext("app/api/app/mcp/test/route.ts");
  const nowIso = new Date().toISOString();

  const { data: tokenRows, error: tokenError } = await query(admin, tables.oauth_tokens, "select", (database, scope) => database.select({ id: tables.oauth_tokens.id, client_id: tables.oauth_tokens.client_id }).from(tables.oauth_tokens).where(and(scope, eq(tables.oauth_tokens.user_id, auth.user.id), isNull(tables.oauth_tokens.revoked_at), gt(tables.oauth_tokens.refresh_expires_at, nowIso))));
  if (tokenError) {
    return NextResponse.json({ error: "Could not load tokens." }, { status: 500 });
  }

  const activeTokens =
    (tokenRows as { id: string; client_id: string }[] | null) ?? [];
  const tokenIds = activeTokens.map((row) => row.id);
  if (tokenIds.length === 0) {
    return NextResponse.json({ connected: false });
  }

  const { data: grantRows, error: grantError } = await query(admin, tables.oauth_token_creeds, "select", (database, scope) => database.select({ token_id: tables.oauth_token_creeds.token_id }).from(tables.oauth_token_creeds).where(and(scope, eq(tables.oauth_token_creeds.creed_id, creedId), inArray(tables.oauth_token_creeds.token_id, tokenIds))));
  if (grantError) {
    return NextResponse.json({ error: "Could not load grants." }, { status: 500 });
  }

  const grantedTokenIds = new Set(
    ((grantRows as { token_id: string }[] | null) ?? []).map(
      (row) => row.token_id,
    ),
  );
  const clientIds = getGrantedClientIds(activeTokens, grantedTokenIds);
  if (clientIds.length === 0) {
    return NextResponse.json({ connected: false });
  }

  const { data: oauthClients, error: clientError } = await query(admin, tables.oauth_clients, "select", (database, scope) => database.select({ client_name: tables.oauth_clients.client_name }).from(tables.oauth_clients).where(and(scope, inArray(tables.oauth_clients.client_id, clientIds))));
  if (clientError) {
    return NextResponse.json({ error: "Could not load clients." }, { status: 500 });
  }
  const clientRows =
    (oauthClients as { client_name: string }[] | null) ?? [];
  const oauthClientNames = clientRows.map((client) => client.client_name);
  let connected = hasActiveConnectionIcon({ icon, oauthClientNames });

  // Some hosts register under the generic OAuth name "MCP Client" and only
  // identify the real agent in JSON-RPC clientInfo. In that one case, use the
  // active Strap's roster to resolve the brand. Never use roster history as a
  // fallback for a specifically named OAuth client, because expired or
  // revoked clients leave historical usage rows behind.
  const hasGenericClient = oauthClientNames.some(
    (name) => name.trim().toLowerCase() === "mcp client",
  );
  if (!connected && hasGenericClient) {
    const { data: rosterRows, error: rosterError } = await query(admin, tables.creed_mcp_clients, "select", (database, scope) => database.select({ client_name: tables.creed_mcp_clients.client_name }).from(tables.creed_mcp_clients).where(and(scope, eq(tables.creed_mcp_clients.user_id, auth.user.id), eq(tables.creed_mcp_clients.creed_id, creedId))));
    if (rosterError) {
      return NextResponse.json({ error: "Could not load MCP clients." }, { status: 500 });
    }
    connected = hasActiveConnectionIcon({
      icon,
      oauthClientNames,
      rosterClientNames: (
        (rosterRows as { client_name: string }[] | null) ?? []
      ).map((row) => row.client_name),
    });
  }

  return NextResponse.json({ connected });
}
