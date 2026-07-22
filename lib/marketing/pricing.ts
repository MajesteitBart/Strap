// Canonical plan facts for the public site. One source of truth shared by:
//   - the pricing cards (components/marketing/pricing-page-view.tsx)
//   - the always-visible, crawlable pricing reference (pricing-reference.tsx)
//   - the SoftwareApplication Offer schema (lib/seo/structured-data.ts)
//   - /llms.txt and /llms-full.txt
//
// Creed has no paid plans: the open source build is free to self-host, and the
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
      "Self-host the open source build. Full Creed editor, all MCP connections, and quality scoring. You run the backend and storage.",
    usage: "Bring your own AI key.",
  },
  {
    name: "Personal",
    price: "$0",
    cadence: "forever",
    summary:
      "Hosted Creed for one person. Cross-device sync, backups, and managed auth and storage.",
    usage: "AI runs on the deployment's included key or your own key (BYOK).",
  },
  {
    name: "Company",
    price: "$0",
    cadence: "forever",
    summary:
      "One shared Company Creed every member's agents read, with member roles, an activity view across the team, and admin controls.",
    usage: "AI runs on the deployment's included key or a company key (BYOK).",
    seats: "Invite as many members as you need.",
  },
];

// One-line pricing summary reused in plain-text surfaces (llms.txt).
export const PRICING_ONE_LINER =
  "Creed is free: self-host the open source build, or use the hosted app with Personal and Company Creeds at no charge. AI features run on an included key or on your own OpenRouter key (BYOK).";
