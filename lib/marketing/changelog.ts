// Curated changelog for the public site. Hand-written, user-facing entries for
// meaningful ships, newest first. This is not a raw commit log; keep each entry
// readable and honest, and add one when something real ships. Freshness here is
// a signal to both search and AI answer engines that Strap is actively built.

export type ChangelogEntry = {
  // ISO date (YYYY-MM-DD), used for ordering and the visible date.
  date: string;
  title: string;
  body: string;
  highlights?: string[];
};

export const changelog: ChangelogEntry[] = [
  {
    date: "2026-07-14",
    title: "Strap CLI",
    body: "Strap now has a first-party terminal client on npm. It uses the same browser OAuth flow and mirrors the live MCP server, so every current and future Strap tool is available from the terminal without a separate implementation.",
    highlights: [
      "Install globally with npm install --global @bvdm/strap or run it once with npx @bvdm/strap.",
      "Interactive and one-shot commands for tools, resources, and prompts.",
      "JSON output for scripts and coding agents, with diagnostics kept on stderr.",
      "Token-bound per-agent attribution keeps CLI status and last-seen times separate from MCP connections.",
      "Secure per-server credential storage, automatic token refresh, and OAuth revocation on logout.",
    ],
  },
  {
    date: "2026-07-12",
    title: "Tab autocomplete",
    body: "Press Tab while editing and Strap finishes the thought in your voice, drawn from your whole file. One suggestion per press, streamed as ghost text in a few hundred milliseconds.",
    highlights: [
      "Tab once for a suggestion, Tab again to accept, Escape or keep typing to dismiss.",
      "Never invents facts: it only recombines what your file already says.",
      "Empty sections get a short drafted opening synthesized from the rest of your Strap.",
      "One metered generation per press against your usage allowance; accepting and dismissing are free.",
    ],
  },
  {
    date: "2026-07-07",
    title: "Company Straps",
    body: "Strap now works for a whole team, not just one person. The Company plan adds a shared Company Strap that every member's agents read before they act.",
    highlights: [
      "One shared Company Strap with Owner, Admin, and Member roles.",
      "Section permissions decide who edits directly and who proposes.",
      "An activity view across every member and agent, with attribution.",
      "Owner-only billing from $129/mo for 10 seats, with extra seats available.",
    ],
  },
  {
    date: "2026-07-03",
    title: "The command panel",
    body: "A command panel with search, ask, and an in-app agent, so you can work your Strap without leaving the file. New paid users get a short welcome tour.",
  },
  {
    date: "2026-07-02",
    title: "Usage credits and tiered pricing",
    body: "AI billing moved to a clear usage-credit model with tiered plans. Hosted plans include a monthly allowance, and BYOK is available when you want model spend on your own key.",
  },
  {
    date: "2026-06-29",
    title: "Guided onboarding and a live roadmap",
    body: "Onboarding is now a guided three-question flow that fits a founder, a writer, or a researcher equally. A public roadmap page shows what we are building, straight from the task board.",
  },
  {
    date: "2026-06-24",
    title: "Interactive landing and examples",
    body: "The landing page was rebuilt around interactive demos of how Strap works, with a new examples page showing concrete moments where one shared file changes the answer.",
  },
  {
    date: "2026-06-22",
    title: "Docs, billing, and connectable agents",
    body: "A full docs page with agent guides and a tool and API reference, subscription billing with monthly and lifetime plans, and the first connectable agents over MCP.",
  },
  {
    date: "2026-06-21",
    title: "Accounts and authentication",
    body: "Email, social, and password-reset authentication, so your Strap is tied to an account you control.",
  },
];
