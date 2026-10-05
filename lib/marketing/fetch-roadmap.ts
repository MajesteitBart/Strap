import "server-only";

// Server-only: fetch the live median board and map it to the public roadmap
// columns. The median API key is a server secret read here and never reaches
// the client (only the mapped, public-safe columns from ./roadmap do). Fails
// closed: if the key is missing or median is unreachable, returns empty columns
// so the page and teaser degrade to a calm empty state, matching the
// fail-closed posture of the other marketing integrations (system status,
// GitHub stars).
import { memoize } from "@/lib/http/memo";
import { log } from "@/lib/observability";
import {
  groupTasksIntoColumns,
  type RoadmapColumn,
} from "@/lib/marketing/roadmap";

const MEDIAN_TASKS_ENDPOINT = "https://api.median.sh/api/tasks";

// Near-real-time without a webhook (median exposes no outbound events):
// cache the board for 60s so moving a task between phases shows up within
// about a minute, while capping median to ~1 request/min per server instance
// no matter how much marketing traffic hits the page.
const BOARD_TTL_MS = 60_000;

async function fetchBoard(apiKey: string): Promise<RoadmapColumn[]> {
  const res = await fetch(`${MEDIAN_TASKS_ENDPOINT}?limit=500`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    log.error(
      "roadmap_upstream_failed",
      { status: res.status },
      new Error("median_tasks_upstream_failed"),
    );
    throw new Error("median_tasks_upstream_failed");
  }

  const payload = (await res.json()) as { tasks?: unknown };
  return groupTasksIntoColumns(payload?.tasks);
}

export async function fetchRoadmap(): Promise<RoadmapColumn[]> {
  const apiKey = process.env.MEDIAN_API_KEY?.trim();
  if (!apiKey) {
    return groupTasksIntoColumns([]);
  }

  try {
    return await memoize("median-roadmap", BOARD_TTL_MS, () => fetchBoard(apiKey));
  } catch (error) {
    if (!(error instanceof Error && error.message === "median_tasks_upstream_failed")) {
      log.error(
        "roadmap_upstream_error",
        {},
        error instanceof Error ? error : new Error(String(error)),
      );
    }
    return groupTasksIntoColumns([]);
  }
}
