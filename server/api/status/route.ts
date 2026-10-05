import { memoize } from "@/lib/http/memo";

const STATUS_URL = process.env.STATUS_API_URL?.trim();

type StatusColor = "green" | "yellow" | "red";
type StatusSummary = { label: string; color: StatusColor };

// Status is identical for every visitor, so the CDN serves it. The upstream
// summary is JSON rather than the rendered status page, avoiding an expensive
// page render and Blob-history scan for a one-line marketing badge.
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
} as const;

const UNAVAILABLE: StatusSummary = { label: "Status unavailable", color: "yellow" };

async function fetchStatus(url: string): Promise<StatusSummary> {
  const response = await fetch(url);
  if (!response.ok) return UNAVAILABLE;

  const body: unknown = await response.json();
  const payload = body && typeof body === "object" ? body as {
    label?: unknown;
    color?: unknown;
  } : null;
  const label = typeof payload?.label === "string" ? payload.label : "Status unavailable";
  const color: StatusColor = payload?.color === "green" || payload?.color === "red"
    ? payload.color
    : "yellow";
  return { label, color };
}

export async function GET() {
  if (!STATUS_URL) {
    return Response.json(UNAVAILABLE, { status: 200, headers: CACHE_HEADERS });
  }

  try {
    const summary = await memoize(`status:${STATUS_URL}`, 60_000, () => fetchStatus(STATUS_URL));
    return Response.json(summary, { headers: CACHE_HEADERS });
  } catch {
    return Response.json(UNAVAILABLE, { headers: CACHE_HEADERS });
  }
}
