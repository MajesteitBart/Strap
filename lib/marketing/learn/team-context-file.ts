import type { Article } from "./types";

export const teamContextFile: Article = {
  slug: "team-context-file",
  title: "A team context file: one page every agent in your company reads",
  description:
    "A team context file is one shared profile every member's AI reads before it answers, so agents work from how your company actually operates instead of re-explained fragments.",
  cluster: "company",
  datePublished: "2026-07-07",
  dateModified: "2026-07-07",
  lead:
    "A team context file is one shared profile that describes how your company works, which every member's AI reads before it answers. Instead of each teammate re-explaining the same company context to their own assistant, and each assistant guessing differently, the whole team points its agents at one page: how you ship, what you name things, who owns what, the constraints that never change.\n\nIt is short and curated, not a document dump. The point is not to store everything the company knows; it is to keep the handful of durable facts that change how an AI should respond for anyone on the team. Because every agent reads the same file, answers stop drifting from how the team actually operates. Creed's Company plan is a team context file: one shared Company Creed every member's agents read, with roles for who can edit what, an activity view of every change, and admin controls, all built on the same plain Markdown a personal Creed uses.",
  body: [
    { type: "h2", text: "The problem it solves" },
    {
      type: "p",
      text: "On a team, everyone re-explains the company to their AI. One person tells Claude how deploys work, another tells ChatGPT the same thing in different words, a third never mentions it and gets a generic answer. The company context lives in a dozen private chats, told a dozen different ways, and none of it is shared.",
    },
    {
      type: "p",
      text: "The result is drift. Agents give advice that does not match how the team actually works, because no agent has ever read how the team actually works. New hires hit it hardest: their assistants know nothing about the codebase, the conventions, or the people, so the human has to fill every gap by hand. A team context file fixes the root cause by giving every agent one page to read first.",
    },
    { type: "h2", text: "What a team context file is" },
    {
      type: "p",
      text: "It is one structured profile for the company, written once and read by every member's connected agents before they answer. Same idea as a personal context file, scoped to the team: identity of the company, how it works, shared goals, conventions, and the constraints that apply to everyone. Agents connect over MCP and read it as the shared layer underneath each person's own profile.",
    },
    {
      type: "p",
      text: "The discipline that keeps it useful is the same one that keeps a personal file useful: specific over complete. A short page that changes how every agent answers beats a long one that reads like an internal encyclopedia. If a line would not change an answer, it does not belong.",
    },
    { type: "h2", text: "Roles, permissions, and control" },
    {
      type: "p",
      text: "A shared file that anyone can silently rewrite is a liability. Creed's Company plan puts structure around it so a team context file stays trustworthy as it grows.",
    },
    {
      type: "ul",
      items: [
        "Roles: Owner, Admin, and Member, so it is clear who can change the shared profile and who reads it.",
        "Section permissions: control which roles can edit which sections, so sensitive parts are not open to everyone.",
        "Activity view: every change to the shared Creed is visible, so edits are reviewable rather than invisible.",
        "Admin controls: manage members and who has write access as the team changes.",
      ],
    },
    {
      type: "p",
      text: "Members' agents can propose narrow updates the same way they do on a personal Creed, and an Owner or Admin approves what stays. The shared page improves as the team works, without becoming a free-for-all.",
    },
    { type: "h2", text: "How it differs from a wiki or knowledge base" },
    {
      type: "p",
      text: "A wiki and a team context file are not the same tool, and it is worth being plain about it. A wiki is where a company writes things down for people to read: long, comprehensive, and good at being the record of everything. A team context file is short, curated, and written to be read by agents before they answer. One is a library. The other is the briefing you hand every agent at the door.",
    },
    {
      type: "table",
      caption: "A wiki or knowledge base compared to a team context file.",
      headers: ["Topic", "Wiki / knowledge base", "Team context file"],
      rows: [
        ["Primary reader", "People", "Every member's AI agents"],
        ["Length", "Long, comprehensive", "Short and curated"],
        ["Read before every answer", "No", "Yes, agents read it first"],
        ["Goal", "Record everything", "Change how agents respond"],
        ["Kept current by", "Manual edits over time", "Agent proposals an admin approves"],
      ],
    },
    {
      type: "p",
      text: "A good wiki is genuinely better at being the complete, searchable record of how a company operates, and a team context file does not replace it. The two work together: the wiki holds the detail, and the context file holds the handful of durable facts you actually want every agent to start from. If the wiki is the manual, the context file is the page pinned above the desk.",
    },
    { type: "h2", text: "What it costs" },
    {
      type: "p",
      text: "Nothing. Creed's Company Creed is a team context file with roles, an activity view, and admin controls, free for as many members as you need. AI features run on the deployment's included key or on the company's own OpenRouter key (BYOK).",
    },
    {
      type: "p",
      text: "It is built on the same plain Markdown as a personal Creed, so a team owns its context file the same way an individual owns theirs: read it, edit it, export it, or delete it, with no lock-in. You can start from a personal context file you already understand and add the shared team layer on top.",
    },
  ],
  faq: [
    {
      question: "What is a team context file?",
      answer:
        "It is one shared profile describing how a company works, which every member's connected AI reads before it answers. It replaces each teammate re-explaining the same context to their own assistant, so agents work from one consistent picture of the team.",
    },
    {
      question: "How is a team context file different from a company wiki?",
      answer:
        "A wiki is a long, comprehensive record written for people to read and search. A team context file is short, curated, and written to be read by agents before every answer. They complement each other: the wiki holds the detail, the context file holds the few durable facts every agent should start from.",
    },
    {
      question: "Who can edit a shared team context file?",
      answer:
        "In Creed's Company plan, members have roles of Owner, Admin, or Member, and section permissions control which roles can edit which parts. Agents can propose narrow updates, and an Owner or Admin approves what stays. Every change is visible in the activity view.",
    },
    {
      question: "How much does a team context file cost with Creed?",
      answer:
        "Nothing. A Company Creed is free, with as many members as you need. AI features run on the deployment's included key or on the company's own OpenRouter key (BYOK).",
    },
    {
      question: "Does it work for teams that are not engineering teams?",
      answer:
        "Yes. A team context file is the same structure for any team; only the examples change. Any group whose members use AI regularly benefits from one shared page every agent reads before it answers.",
    },
  ],
  related: [
    { label: "A CLAUDE.md for your whole team", href: "/learn/team-claude-md" },
    { label: "What is a personal context file", href: "/learn/what-is-a-personal-context-file" },
    { label: "Memory MCP servers compared", href: "/learn/memory-mcp-servers-compared" },
    { label: "Creed for teams", href: "/company" },
  ],
};
