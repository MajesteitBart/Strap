import * as tables from "@/db/schema/application";
import { getAgentIconKind } from "@/lib/agent-icon";
import { requireApiAuth } from "@/lib/api-auth";
import { query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import { resolveCliAgentStatuses } from "@/lib/mcp-connection-status";
import { and, eq, gt, inArray, isNull, like } from "drizzle-orm";
import { NextResponse } from "next/server";

type TokenRow = { id: string; client_id: string };
type ClientRow = { client_id: string; client_name: string };
type RosterRow = { client_id: string; last_seen_at: string | null };

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const params = new URL(request.url).searchParams;
  const creedId =
    params.get("strapId")?.trim() || params.get("creedId")?.trim();
  if (!creedId) {
    return NextResponse.json({ error: "Missing Strap id." }, { status: 400 });
  }

  const admin = serviceContext("app/api/app/mcp/cli-status/route.ts");
  const nowIso = new Date().toISOString();
  const { data: tokenData, error: tokenError } = await query(admin, tables.oauth_tokens, "select", (database, scope) => database.select({ id: tables.oauth_tokens.id, client_id: tables.oauth_tokens.client_id }).from(tables.oauth_tokens).where(and(scope, eq(tables.oauth_tokens.user_id, auth.user.id), isNull(tables.oauth_tokens.revoked_at), gt(tables.oauth_tokens.refresh_expires_at, nowIso))));
  if (tokenError) {
    return NextResponse.json({ error: "Could not load tokens." }, { status: 500 });
  }

  const tokens = (tokenData as TokenRow[] | null) ?? [];
  if (tokens.length === 0) {
    return NextResponse.json({ connected: false, agents: {} });
  }

  const { data: grantData, error: grantError } = await query(admin, tables.oauth_token_creeds, "select", (database, scope) => database.select({ token_id: tables.oauth_token_creeds.token_id }).from(tables.oauth_token_creeds).where(and(scope, eq(tables.oauth_token_creeds.creed_id, creedId), inArray(tables.oauth_token_creeds.token_id, tokens.map((token) => token.id)))));
  if (grantError) {
    return NextResponse.json({ error: "Could not load grants." }, { status: 500 });
  }
  const grantedTokenIds = new Set(
    ((grantData as { token_id: string }[] | null) ?? []).map(
      (grant) => grant.token_id,
    ),
  );
  const grantedTokens = tokens.filter((token) => grantedTokenIds.has(token.id));
  if (grantedTokens.length === 0) {
    return NextResponse.json({ connected: false, agents: {} });
  }

  const { data: clientData, error: clientError } = await query(admin, tables.oauth_clients, "select", (database, scope) => database.select({ client_id: tables.oauth_clients.client_id, client_name: tables.oauth_clients.client_name }).from(tables.oauth_clients).where(and(scope, inArray(tables.oauth_clients.client_id, [...new Set(grantedTokens.map((token) => token.client_id))]))));
  if (clientError) {
    return NextResponse.json({ error: "Could not load clients." }, { status: 500 });
  }
  const cliClientIds = new Set(
    ((clientData as ClientRow[] | null) ?? [])
      .filter((client) => getAgentIconKind(client.client_name) === "cli")
      .map((client) => client.client_id),
  );
  const activeCliTokenIds = new Set(
    grantedTokens
      .filter((token) => cliClientIds.has(token.client_id))
      .map((token) => token.id),
  );
  if (activeCliTokenIds.size === 0) {
    return NextResponse.json({ connected: false, agents: {} });
  }

  const { data: rosterData, error: rosterError } = await query(admin, tables.creed_mcp_clients, "select", (database, scope) => database.select({ client_id: tables.creed_mcp_clients.client_id, last_seen_at: tables.creed_mcp_clients.last_seen_at }).from(tables.creed_mcp_clients).where(and(scope, eq(tables.creed_mcp_clients.user_id, auth.user.id), eq(tables.creed_mcp_clients.creed_id, creedId), like(tables.creed_mcp_clients.client_id, "cli-%"))));
  if (rosterError) {
    return NextResponse.json({ error: "Could not load CLI usage." }, { status: 500 });
  }

  const agents = resolveCliAgentStatuses(
    activeCliTokenIds,
    ((rosterData as RosterRow[] | null) ?? []).map((row) => ({
      clientId: row.client_id,
      lastSeenAt: row.last_seen_at,
    })),
  );

  return NextResponse.json({ connected: true, agents });
}
