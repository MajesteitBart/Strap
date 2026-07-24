import "server-only";
import { randomBytes } from "node:crypto";
import { getSiteUrl } from "@/lib/supabase/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseLikeClient } from "@/lib/supabase/types";
import { digestCredential } from "@/lib/headless-access-shared";
import { getOAuthClient, type CreedGrantMode, type OAuthClient } from "@/lib/oauth";
import { listUserStraps, type StrapSummary } from "@/lib/strap-membership";
import { recordAuditEvent } from "@/lib/audit-log";
import {
  capDeviceGrantMode,
  createDeviceUserCode,
  normalizeDeviceUserCode,
  normalizeOAuthScope,
} from "@/lib/oauth-device-shared";

const DEVICE_TTL_MS = 10 * 60 * 1000;
const DEVICE_INTERVAL_SECONDS = 5;

type RpcResult = { data: unknown; error: { message: string } | null };
type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult> };

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

function adminDb(): SupabaseLikeClient {
  return getSupabaseAdminClient() as unknown as SupabaseLikeClient;
}

function rpcDb(): RpcClient {
  return getSupabaseAdminClient() as unknown as RpcClient;
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
  const { error } = await adminDb().from("oauth_device_authorizations").insert({
    device_code_hash: digestCredential(deviceCode),
    user_code_hash: digestCredential(normalizedUserCode),
    client_id: input.clientId,
    scope: normalizeOAuthScope(input.scope),
    interval_seconds: DEVICE_INTERVAL_SECONDS,
    expires_at: new Date(Date.now() + DEVICE_TTL_MS).toISOString(),
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
  const { data, error } = await rpcDb().rpc("record_oauth_device_verification", {
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
  const { data, error } = await adminDb()
    .from("oauth_device_authorizations")
    .select("id, client_id, scope, status, expires_at")
    .eq("id", input.requestId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
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
    const { data } = await adminDb()
      .from("oauth_device_authorizations")
      .update({ status: "denied" })
      .eq("id", input.requestId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
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
  const { data } = await adminDb()
    .from("oauth_device_authorizations")
    .update({
      status: "approved",
      user_id: input.userId,
      creed_id: creed.id,
      mode,
      approved_at: now,
    })
    .eq("id", input.requestId)
    .eq("status", "pending")
    .gt("expires_at", now)
    .select("id")
    .maybeSingle();
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
  const { data, error } = await rpcDb().rpc("consume_oauth_device_authorization", {
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
