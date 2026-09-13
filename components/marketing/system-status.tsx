"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type SystemStatus =
  | "operational"
  | "degraded"
  | "maintenance"
  | "outage"
  | "unknown";

type LiveStatusColor = "green" | "yellow" | "red";

type LiveStatusResponse = {
  label?: unknown;
  color?: unknown;
};

const DEFAULT_STATUS: SystemStatus = "operational";
const STATUS_ENDPOINT = "/api/status";

const STATUS_DEFAULTS: Record<SystemStatus, { label: string; color: LiveStatusColor }> = {
  operational: { label: "Fully operational", color: "green" },
  degraded: { label: "Degraded performance", color: "yellow" },
  maintenance: { label: "Scheduled maintenance", color: "yellow" },
  outage: { label: "Service disruption", color: "red" },
  unknown: { label: "Status unavailable", color: "yellow" },
};

function isLiveStatusColor(value: unknown): value is LiveStatusColor {
  return value === "green" || value === "yellow" || value === "red";
}

// Footer status pill in the worktable language: a framed monospace label
// with a square swatch in the ready, agents, or warning colour. Polls the
// status route while visible so the label tracks the live deployment.
export function SystemStatusPill({
  status = DEFAULT_STATUS,
  href,
  className,
}: {
  status?: SystemStatus;
  href?: string;
  className?: string;
}) {
  const [liveStatus, setLiveStatus] = useState(STATUS_DEFAULTS[status]);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      // Skip while hidden; the next visible poll (or refocus) catches up.
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch(STATUS_ENDPOINT);
        if (!response.ok) return;

        const data = (await response.json()) as LiveStatusResponse;
        const label = typeof data.label === "string" ? data.label.trim() : "";
        const color = isLiveStatusColor(data.color) ? data.color : null;

        if (!cancelled && label && color) {
          setLiveStatus({ label, color });
        }
      } catch {
        // Keep the server-rendered fallback if the status endpoint is unreachable.
      }
    }

    void loadStatus();
    // 5 min cadence: the route is CDN-cached for 60s anyway, and a status
    // pill in the footer doesn't need sub-minute freshness.
    const intervalId = window.setInterval(loadStatus, 300_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const content = (
    <>
      <span className="strap-footer-status-dot" data-color={liveStatus.color} aria-hidden="true" />
      <span>{liveStatus.label}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={cn("strap-footer-status", className)}
      >
        {content}
      </a>
    );
  }

  return <div className={cn("strap-footer-status", className)}>{content}</div>;
}
