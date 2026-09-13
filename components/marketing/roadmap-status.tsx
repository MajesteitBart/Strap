import { cn } from "@/lib/utils";
import type { RoadmapColumnId } from "@/lib/marketing/roadmap";

// Per-status resource tone for the /roadmap board: Next reads as Context blue,
// In progress as Agents yellow, Shipped as Environments green.
export const ROADMAP_STATUS_TONE: Record<RoadmapColumnId, "context" | "agents" | "environments"> = {
  next: "context",
  in_progress: "agents",
  shipped: "environments",
};

// The small inline status pill used on the /roadmap board column headers.
export function RoadmapStatusPill({
  id,
  label,
  className,
}: {
  id: RoadmapColumnId;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("strap-pill strap-pill-solid", `strap-tone-${ROADMAP_STATUS_TONE[id]}`, className)}>
      {label}
    </span>
  );
}
