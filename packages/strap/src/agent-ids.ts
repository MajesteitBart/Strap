export const ATTRIBUTABLE_AGENT_IDS = [
  "chatgpt",
  "claude",
  "grok",
  "whirl",
  "claudecode",
  "codex",
  "cursor",
  "opencode",
  "devin",
  "replit",
  "v0",
  "factory",
  "openclaw",
  "hermes",
  "manus",
  "custom",
] as const;

export type AttributableAgentId = (typeof ATTRIBUTABLE_AGENT_IDS)[number];
