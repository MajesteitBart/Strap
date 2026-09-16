// Canonical plan facts for the public site. One source of truth shared by:
//   - the pricing cards (components/marketing/pricing-page-view.tsx)
//   - the always-visible, crawlable pricing reference (pricing-reference.tsx)
//   - the SoftwareApplication Offer schema (lib/seo/structured-data.ts)
//   - /llms.txt and /llms-full.txt
//
// Strap has no paid plans: the open source build is free to self-host, and the
// hosted app is free to use. Keeping the facts in one module means a crawler,
// an AI answer engine, and a human reading the cards always get the same story.

// A flat, human-and-crawler-readable description of every plan.
export type PlanFact = {
  name: string;
  price: string;
  cadence: string;
  summary: string;
  usage: string;
  seats?: string;
};

export const PLAN_FACTS: PlanFact[] = [
  {
    name: "Open",
    price: "$0",
    cadence: "forever",
    summary:
      "Self-host the open source build. Full Strap editor, all MCP connections, and proposal review. You run the backend and storage.",
    usage: "Use the agents you already connect. Strap runs no in-app LLM calls and needs no model API key.",
  },
  {
    name: "Personal",
    price: "$0",
    cadence: "forever",
    summary:
      "Hosted Strap for one person. Cross-device sync, backups, and managed auth and storage.",
    usage: "Use the agents you already connect. Strap runs no in-app LLM calls and needs no model API key.",
  },
  {
    name: "Company",
    price: "$0",
    cadence: "forever",
    summary:
      "One shared Company Strap every member's agents read, with member roles, an activity view across the team, and admin controls.",
    usage: "Use the agents you already connect. Strap runs no in-app LLM calls and needs no model API key.",
    seats: "Invite as many members as you need.",
  },
];

// One-line pricing summary reused in plain-text surfaces (llms.txt).
export const PRICING_ONE_LINER =
  "Strap is free: self-host the open source build, or use the hosted app with Personal and Company Straps at no charge. Use the agents you already connect. Strap runs no in-app LLM calls and needs no model API key.";
