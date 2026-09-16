import { getAppVersion } from "@/lib/app-version";
import { getAuthServer } from "@/lib/auth/server";
import { serviceContext } from "@/lib/db/service";
import { isDatabaseConfigured } from "@/lib/env";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CORS: this endpoint is intentionally public and contains no user data,
// only aggregated component health. Allowing any origin lets status.creed.md
// (or any external dashboard) fetch it from the browser without a proxy.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate",
} as const;

const PROBE_TIMEOUT_MS = 4_000;

type ComponentName = "api" | "db" | "auth";

type ComponentStatus = {
  ok: boolean;
  latencyMs: number;
  error?: string;
};

type HealthPayload = {
  status: "ok" | "degraded" | "down";
  time: string;
  version: string | null;
  uptimeSeconds: number;
  components: Record<ComponentName, ComponentStatus>;
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function HEAD() {
  // HEAD is cheap and useful for plain uptime monitors that only care about
  // 2xx vs 5xx. We still run the full probe so the HTTP status reflects
  // real component health.
  const { httpStatus } = await buildPayload();
  return new NextResponse(null, {
    status: httpStatus,
    headers: { ...CORS_HEADERS, ...NO_STORE_HEADERS },
  });
}

export async function GET() {
  const { payload, httpStatus } = await buildPayload();
  return NextResponse.json(payload, {
    status: httpStatus,
    headers: { ...CORS_HEADERS, ...NO_STORE_HEADERS },
  });
}

async function buildPayload(): Promise<{
  payload: HealthPayload;
  httpStatus: number;
}> {
  const apiStart = Date.now();

  // Run independent probes in parallel so total latency is bounded by the
  // slowest probe, not the sum of all of them.
  const [db, auth] = await Promise.all([probeDatabase(), probeAuth()]);

  const components: Record<ComponentName, ComponentStatus> = {
    // The API component is implicit: if this handler is responding, the
    // API surface is up. Latency for "api" is the route's own time-to-here,
    // useful as a baseline reference number for the other probes.
    api: { ok: true, latencyMs: Date.now() - apiStart },
    db,
    auth,
  };

  const allOk = Object.values(components).every((c) => c.ok);
  const anyOk = Object.values(components).some((c) => c.ok);
  const status: HealthPayload["status"] = allOk
    ? "ok"
    : anyOk
      ? "degraded"
      : "down";

  // 200 for ok/degraded so nuanced consumers read the JSON; 503 only when
  // everything is down so plain HTTP-status monitors still flag hard
  // outages.
  const httpStatus = status === "down" ? 503 : 200;

  return {
    httpStatus,
    payload: {
      status,
      time: new Date().toISOString(),
      version: getAppVersion(),
      uptimeSeconds: Math.round(process.uptime?.() ?? 0),
      components,
    },
  };
}

async function probeDatabase(): Promise<ComponentStatus> {
  if (!isDatabaseConfigured()) return { ok: false, latencyMs: 0, error: "database_not_configured" };
  const start = Date.now();
  try {
    await withTimeout(serviceContext("health probe").database.execute(sql`select id from public.creeds limit 1`), PROBE_TIMEOUT_MS);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (error) { return { ok: false, latencyMs: Date.now() - start, error: redactError(error) }; }
}

async function probeAuth(): Promise<ComponentStatus> {
  if (!isDatabaseConfigured()) return { ok: false, latencyMs: 0, error: "auth_not_configured" };
  const start = Date.now();
  try {
    getAuthServer();
    await withTimeout(serviceContext("auth health probe").database.execute(sql`select id from public.users limit 1`), PROBE_TIMEOUT_MS);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (error) { return { ok: false, latencyMs: Date.now() - start, error: redactError(error) }; }
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("probe_timeout"));
    }, ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

// Probes run with privileged credentials, so raw error messages can leak
// connection strings, hostnames, or stack traces. Surface a short, stable
// label to external consumers and keep the detail server-side only.
function redactError(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "unknown_error";
  if (/timeout/i.test(raw)) return "probe_timeout";
  if (/fetch|network|econn|enotfound|eai_again/i.test(raw)) {
    return "network_error";
  }
  return "probe_failed";
}
