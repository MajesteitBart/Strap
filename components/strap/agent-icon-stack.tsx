"use client";

import { StrapAgentGlyph, IntegrationGlyph } from "@/components/strap/brand";
import {
  isStrapFirstPartyAttribution,
  normalizeStrapAttribution,
} from "@/components/strap/brand-attribution";
import { getAgentIconKind } from "@/lib/agent-icon";
import type { AgentIconKind, McpClient } from "@/lib/strap-data";
import { cn } from "@/lib/utils";

export { getAgentIconKind };

type AgentLike = string | Pick<McpClient, "name" | "icon"> | { agentName?: string; icon?: AgentIconKind };

function normalizeAgent(agent: AgentLike): { name: string; icon: AgentIconKind } {
  if (typeof agent === "string") {
    return {
      name: normalizeStrapAttribution(agent),
      icon: getAgentIconKind(agent),
    };
  }

  const rawName = "name" in agent ? agent.name : agent.agentName ?? "Agent";
  return {
    name: normalizeStrapAttribution(rawName),
    icon: agent.icon ?? getAgentIconKind(rawName),
  };
}

function dedupeAgents(agents: AgentLike[]) {
  const seen = new Set<string>();

  return agents
    .map(normalizeAgent)
    .filter((agent) => {
      const key = `${agent.icon}:${agent.name.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

export function AgentIconStack({
  agents,
  maxVisible = 5,
  className,
  itemClassName,
  variant = "stacked",
}: {
  agents: AgentLike[];
  maxVisible?: number;
  className?: string;
  itemClassName?: string;
  variant?: "stacked" | "inline";
}) {
  const uniqueAgents = dedupeAgents(agents);
  const visibleAgents = uniqueAgents.slice(0, maxVisible);
  const overflowCount = Math.max(uniqueAgents.length - visibleAgents.length, 0);

  if (visibleAgents.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        variant === "stacked" ? "flex items-center overflow-visible py-0.5" : "flex items-center overflow-visible",
        className
      )}
      aria-label={visibleAgents.map((agent) => agent.name).join(", ")}
    >
      {visibleAgents.map((agent, index) => (
        <span
          key={`${agent.icon}-${agent.name}`}
          style={{ zIndex: index + 1 }}
          className={cn(
            variant === "stacked"
              ? "relative -ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white p-[1.5px] shadow-[0_0_0_1px_rgba(255,255,255,0.96)] first:ml-0"
              : "relative inline-flex h-4 w-4 items-center justify-center first:ml-0",
            itemClassName
          )}
        >
          {isStrapFirstPartyAttribution(agent.name) ? (
            <StrapAgentGlyph className={variant === "stacked" ? "h-[64%] w-[64%]" : "h-full w-full scale-[0.82]"} />
          ) : (
            <IntegrationGlyph
              kind={agent.icon}
              framed={false}
              className="h-full w-full"
              assetClassName={variant === "stacked" ? "h-full w-full" : "h-full w-full scale-[0.98]"}
              iconClassName={cn(
                "h-full w-full",
                agent.icon === "custom" && (variant === "stacked" ? "scale-[0.78]" : "scale-[0.82]")
              )}
            />
          )}
        </span>
      ))}
      {overflowCount > 0 ? (
        <span
          style={{ zIndex: visibleAgents.length + 1 }}
          className={cn(
            variant === "stacked"
              ? "relative -ml-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-medium text-[var(--strap-text-primary)] shadow-[0_0_0_1px_rgba(255,255,255,0.96)]"
              : "relative inline-flex items-center justify-center text-[10px] font-medium text-[var(--strap-text-tertiary)]",
            itemClassName
          )}
        >
          +{overflowCount}
        </span>
      ) : null}
    </div>
  );
}
