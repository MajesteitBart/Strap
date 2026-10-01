// Canonical FAQ content for the public site. Shared by the visible FAQ on
// /home (components/marketing/below-hero-sections.tsx) and the FAQPage
// JSON-LD that ships on the same page (lib/seo/structured-data.ts). Keeping
// one source means the structured data can never drift from the rendered
// answers, which is exactly what search and AI engines check for.

export type FaqItem = {
  question: string;
  answer: string;
};

export const homeFaqItems: FaqItem[] = [
  {
    question: "What actually goes in a Strap?",
    answer:
      "Who you are, what you're working toward, how you like AI to talk to you, the people and routines that shape your week, plus any health, accessibility, or hard noes AI should respect. One concise profile, not a journal.",
  },
  {
    question: "Why not just retell every AI who I am each time?",
    answer:
      "Because it doesn't stick, doesn't cross tools, and you end up repeating yourself. Strap gives every AI the same profile to read before answering, and lets them propose updates as they learn more about you.",
  },
  {
    question: "Which tools does Strap work with?",
    answer:
      "Strap connects to agents like Claude Code, Codex, Cursor, and ChatGPT over MCP, offers a terminal CLI and scoped headless API keys, and integrates with GitHub for version control.",
  },
  {
    question: "What gets written back to Strap?",
    answer:
      "Durable things AI learns about you, a sharper preference, a new routine, a goal that shifted. Not session recap, not mood, not generic praise.",
  },
  {
    question: "Do I have to review every change?",
    answer:
      "No. You can keep agent edits reviewable, or trust them to write directly when you want a lighter loop. The point is control when you want it, not friction by default.",
  },
  {
    question: "Is Strap for teams or just for me?",
    answer:
      "Both. Strap starts as a personal profile, and a Company Strap adds one shared file that every member's agents read, with member roles, an activity view across the team, and admin controls. It is free, like everything else in Strap.",
  },
];

// FAQ for the /pricing page. Phrased as standalone facts so an answer engine
// can quote one item.
export const pricingFaqItems: FaqItem[] = [
  {
    question: "Is Strap free?",
    answer:
      "Yes, all of it. Strap is open source and free to self-host, with the full editor, every MCP connection, and proposal review. The hosted app is free too, and adds cross-device sync, backups, and managed auth and storage.",
  },
  {
    question: "How do agents improve my Strap?",
    answer:
      "Use the agents you already connect. Strap runs no in-app LLM calls and needs no model API key.",
  },
  {
    question: "Do I need an API key for AI features?",
    answer:
      "No. Your connected agents read your Strap and propose updates using your existing agent service. You approve or decline their proposals in Strap.",
  },
  {
    question: "How much does a Company Strap cost?",
    answer:
      "Nothing. A Company Strap is free, with as many members as you need, roles and section permissions, a team activity view, and proposal review.",
  },
  {
    question: "Do I own my data?",
    answer:
      "Your Strap is portable Markdown you can export at any time. Deleting your account removes active product data; qualified audit and security records may remain for the retention periods in the Privacy Policy.",
  },
];

// FAQ for the /company landing page. Standalone answers about the Company plan
// so an answer engine can quote a single item.
export const companyFaqItems: FaqItem[] = [
  {
    question: "What is a Company Strap?",
    answer:
      "A Company Strap is one shared context file that every member's agents read before they act. It holds the canonical company context: how the team works, what it is building, and the conventions and constraints that apply to everyone, so agents stop drifting from how the team actually operates.",
  },
  {
    question: "How is it different from a wiki or knowledge base?",
    answer:
      "A wiki is a large, complete record for people to search. A Company Strap is short, curated, and written to be read by agents before they answer. It is the profile your AI reads, not the archive your team browses. Most teams keep both.",
  },
  {
    question: "What roles does a Company Strap have?",
    answer:
      "Three: Owner, who manages company settings, members, and content; Admin, who manages members and content; and Member, who reads and proposes. Section permissions can further control who edits each section directly versus by proposal, and every change is attributed in the activity view.",
  },
  {
    question: "Do team members need their own personal Strap?",
    answer:
      "No. A member needs a Strap account to join, but not a personal Strap. They connect their own agents over MCP and read the shared Company Strap. They can keep a personal Strap too, and switch between them from the workspace dropdown.",
  },
  {
    question: "How much does a Company Strap cost?",
    answer:
      "Nothing. It is free, with as many members as you need, and members use their existing connected agents.",
  },
];

// FAQ about personal context files (surfaced in llms-full.txt). Phrased as direct, standalone answers
// so answer engines can quote a single item without surrounding context.
export const contextFileFaqItems: FaqItem[] = [
  {
    question: "What is a personal context file?",
    answer:
      "A personal context file is one structured profile that describes who you are and how you want AI to work with you. Every AI tool you connect reads it before it answers, so your context stays consistent across tools and sessions instead of being re-explained each time.",
  },
  {
    question: "How is a personal context file different from a chatbot's memory?",
    answer:
      "Chatbot memory lives inside one app and cannot move with you. A personal context file is one portable file you own. It works across every agent you connect, and you can read, edit, or export it as plain Markdown at any time.",
  },
  {
    question: "How do agents keep a personal context file updated?",
    answer:
      "As an agent learns something durable about you, a sharper preference, a new routine, or a goal that shifted, it proposes a narrow update. You approve what stays, or let trusted agents edit directly. Session chatter and one-off details are left out by design.",
  },
  {
    question: "What goes in a personal context file?",
    answer:
      "Strap organizes it into ten sections: Identity, Goals, Work, Preferences, and Routines as the always-on core, plus optional Beliefs, Constraints, People, Health, and Context. Each section is short, specific, and written to change how AI responds.",
  },
  {
    question: "Which tools does a personal context file work with?",
    answer:
      "Strap connects to agents like Claude Code, Codex, Cursor, and ChatGPT over MCP, offers a terminal CLI and scoped headless API keys, and integrates with GitHub for version control.",
  },
  {
    question: "Do I own my personal context file?",
    answer:
      "Yes. Strap is portable Markdown you control and can export. Account deletion removes active product data subject to the retention periods in the Privacy Policy.",
  },
];
