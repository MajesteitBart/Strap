import * as tables from "@/db/schema/application";
import { recordAuditEvent } from "@/lib/audit-log";
import { authorizeValues } from "@/lib/authz/policies";
import type { DatabaseContext } from "@/lib/db/context";
import { callProcedure } from "@/lib/db/procedures";
import { maybeOne, query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import { getSiteUrl } from "@/lib/env";
import { digestCredential } from "@/lib/headless-access-shared";
import { getOAuthClient, type CreedGrantMode, type OAuthClient } from "@/lib/oauth";
import {
  capDeviceGrantMode,
  createDeviceUserCode,
  normalizeDeviceUserCode,
  normalizeOAuthScope,
} from "@/lib/oauth-device-shared";
import { listUserStraps, type StrapSummary } from "@/lib/strap-membership";
import { and, eq, gt } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import "server-only";

const DEVICE_TTL_MS = 10 * 60 * 1000;
const DEVICE_INTERVAL_SECONDS = 5;




type DeviceRow = {
  id: string;
  client_id: string;
  scope: string;
  status: "pending" | "approved" | "denied" | "consumed";
  expires_at: string;
};

export type DevicePollResult =
  | { outcome: "approved"; userId: string; scope: string; creedId: string; mode: CreedGrantMode }
  | { outcome: "authorization_pending" | "slow_down"; retryAfterSeconds: number }
  | { outcome: "access_denied" | "expired_token" | "invalid_grant" | "server_error" };

function adminDb(): DatabaseContext {
  return serviceContext("lib/oauth-device.ts");
}



export async function createDeviceAuthorization(input: {
  clientId: string;
  scope: string;
}): Promise<{
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}> {
  const deviceCode = `strap_dc_${randomBytes(32).toString("base64url")}`;
  const userCode = createDeviceUserCode();
  const normalizedUserCode = normalizeDeviceUserCode(userCode);
  if (!normalizedUserCode) throw new Error("Could not generate device code.");
  const { error } = await query(adminDb(), tables.oauth_device_authorizations, "insert", async (database, _scope) => {
    const values = {
    device_code_hash: digestCredential(deviceCode),
    user_code_hash: digestCredential(normalizedUserCode),
    client_id: input.clientId,
    scope: normalizeOAuthScope(input.scope),
    interval_seconds: DEVICE_INTERVAL_SECONDS,
    expires_at: new Date(Date.now() + DEVICE_TTL_MS).toISOString(),
  } as typeof tables.oauth_device_authorizations.$inferInsert;
    await authorizeValues(adminDb(), tables.oauth_device_authorizations, "insert", values);
    return database.insert(tables.oauth_device_authorizations).values(values);
  });
  if (error) throw new Error("Could not create device authorization.");
  return {
    deviceCode,
    userCode,
    verificationUri: `${getSiteUrl().replace(/\/$/, "")}/device`,
    expiresIn: Math.floor(DEVICE_TTL_MS / 1000),
    interval: DEVICE_INTERVAL_SECONDS,
  };
}

export async function verifyDeviceUserCode(value: string): Promise<string | null> {
  const normalized = normalizeDeviceUserCode(value);
  if (!normalized) return null;
  const { data, error } = await callProcedure(adminDb(), "record_oauth_device_verification", {
    p_user_code_hash: digestCredential(normalized),
  });
  if (error) return null;
  const row = (data as Array<{ request_id: string }> | null)?.[0];
  return row?.request_id ?? null;
}

export async function getDeviceApproval(input: {
  requestId: string;
  userId: string;
}): Promise<{ request: DeviceRow; client: OAuthClient; creeds: StrapSummary[] } | null> {
  const { data, error } = await query(adminDb(), tables.oauth_device_authorizations, "select", (database, scope) => database.select({ id: tables.oauth_device_authorizations.id, client_id: tables.oauth_device_authorizations.client_id, scope: tables.oauth_device_authorizations.scope, status: tables.oauth_device_authorizations.status, expires_at: tables.oauth_device_authorizations.expires_at }).from(tables.oauth_device_authorizations).where(and(scope, eq(tables.oauth_device_authorizations.id, input.requestId), eq(tables.oauth_device_authorizations.status, "pending"), gt(tables.oauth_device_authorizations.expires_at, new Date().toISOString())))).then(maybeOne);
  if (error || !data) return null;
  const row = data as DeviceRow;
  const [client, creeds] = await Promise.all([
    getOAuthClient(row.client_id),
    listUserStraps(adminDb(), input.userId),
  ]);
  if (!client || creeds.length === 0) return null;
  return { request: row, client, creeds };
}

export async function decideDeviceAuthorization(input: {
  requestId: string;
  userId: string;
  creedId: string | null;
  mode: CreedGrantMode;
  decision: "allow" | "deny";
  request: Request;
}): Promise<boolean> {
  const approval = await getDeviceApproval({ requestId: input.requestId, userId: input.userId });
  if (!approval) return false;
  if (input.decision === "deny") {
    const { data } = await query(adminDb(), tables.oauth_device_authorizations, "update", async (database, scope) => {
    const values = { status: "denied" } as Partial<typeof tables.oauth_device_authorizations.$inferInsert>;
    await authorizeValues(adminDb(), tables.oauth_device_authorizations, "update", values);
    return database.update(tables.oauth_device_authorizations).set(values).where(and(scope, eq(tables.oauth_device_authorizations.id, input.requestId), eq(tables.oauth_device_authorizations.status, "pending"))).returning({ id: tables.oauth_device_authorizations.id });
  }).then(maybeOne);
    if (!data) return false;
    void recordAuditEvent({
      userId: input.userId,
      action: "oauth.device_denied",
      metadata: { requestId: input.requestId, clientId: approval.client.clientId },
      request: input.request,
    });
    return true;
  }

  const creed = approval.creeds.find((item) => item.id === input.creedId);
  if (!creed) return false;
  const mode = capDeviceGrantMode(input.mode, approval.request.scope);
  const now = new Date().toISOString();
  const { data } = await query(adminDb(), tables.oauth_device_authorizations, "update", async (database, scope) => {
    const values = {
      status: "approved",
      user_id: input.userId,
      creed_id: creed.id,
      mode,
      approved_at: now,
    } as Partial<typeof tables.oauth_device_authorizations.$inferInsert>;
    await authorizeValues(adminDb(), tables.oauth_device_authorizations, "update", values);
    return database.update(tables.oauth_device_authorizations).set(values).where(and(scope, eq(tables.oauth_device_authorizations.id, input.requestId), eq(tables.oauth_device_authorizations.status, "pending"), gt(tables.oauth_device_authorizations.expires_at, now))).returning({ id: tables.oauth_device_authorizations.id });
  }).then(maybeOne);
  if (!data) return false;
  void recordAuditEvent({
    userId: input.userId,
    action: "oauth.device_approved",
    metadata: { requestId: input.requestId, clientId: approval.client.clientId, creedId: creed.id, mode },
    request: input.request,
  });
  return true;
}

export async function pollDeviceAuthorization(input: {
  deviceCode: string;
  clientId: string;
}): Promise<DevicePollResult> {
  const { data, error } = await callProcedure(adminDb(), "consume_oauth_device_authorization", {
    p_device_code_hash: digestCredential(input.deviceCode),
    p_client_id: input.clientId,
  });
  if (error) return { outcome: "server_error" };
  const row = (data as Array<{
    outcome: DevicePollResult["outcome"];
    authorized_user_id: string | null;
    authorized_scope: string | null;
    authorized_creed_id: string | null;
    authorized_mode: CreedGrantMode | null;
    retry_after_seconds: number | null;
  }> | null)?.[0];
  if (!row) return { outcome: "invalid_grant" };
  if (
    row.outcome === "approved" &&
    row.authorized_user_id &&
    row.authorized_scope &&
    row.authorized_creed_id &&
    row.authorized_mode
  ) {
    return {
      outcome: "approved",
      userId: row.authorized_user_id,
      scope: row.authorized_scope,
      creedId: row.authorized_creed_id,
      mode: row.authorized_mode,
    };
  }
  if (row.outcome === "authorization_pending" || row.outcome === "slow_down") {
    return { outcome: row.outcome, retryAfterSeconds: row.retry_after_seconds ?? DEVICE_INTERVAL_SECONDS };
  }
  if (row.outcome === "access_denied" || row.outcome === "expired_token" || row.outcome === "invalid_grant") {
    return { outcome: row.outcome };
  }
  return { outcome: "server_error" };
}
