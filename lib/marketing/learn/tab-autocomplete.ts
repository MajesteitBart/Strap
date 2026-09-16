import type { Article } from "./types";

export const tabAutocomplete: Article = {
  slug: "tab-autocomplete",
  title: "Improve your context with a connected agent",
  description: "Ask your existing agent for focused profile improvements, then approve or decline its proposals in Strap.",
  cluster: "category",
  datePublished: "2026-07-12",
  dateModified: "2026-09-16",
  lead: "Strap no longer includes Tab autocomplete or an in-app assistant. Your connected agents can read your profile and propose improvements using the agent service you already use. Strap needs no separate model API key.",
  body: [
    { type: "h2", text: "Ask for a focused review" },
    { type: "p", text: "Connect your agent over MCP, then ask it to read your Strap and suggest changes to a specific section. Ask for concrete, current information and removal of stale or repeated details." },
    { type: "h2", text: "Review changes in Strap" },
    { type: "p", text: "Set a section to Propose when you want to review every change. The agent files its suggestion as a proposal. You can approve or decline it in the editor. Direct editing remains available for sections where you explicitly allow it." },
  ],
  faq: [{ question: "Does Strap need a model API key?", answer: "No. Strap runs no in-app LLM calls. Your connected agent uses its own subscription or provider configuration." }],
  related: [{ label: "Connect an agent", href: "/connections" }, { label: "Write a useful profile", href: "/learn/what-is-a-personal-context-file" }],
};
