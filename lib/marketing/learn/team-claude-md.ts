import type { Article } from "./types";

export const teamClaudeMd: Article = {
  slug: "team-claude-md",
  title: "A CLAUDE.md for your whole team",
  description:
    "A repo CLAUDE.md guides one agent in one project. A shared Company Creed is a portable CLAUDE.md for the whole team: every member's agents read it, everywhere, not just for coders.",
  cluster: "company",
  datePublished: "2026-07-07",
  dateModified: "2026-07-07",
  lead:
    "Engineers already know CLAUDE.md: a file at the root of a repository that tells Claude Code how that project works, its conventions, its commands, its gotchas. It is genuinely useful, and it is also narrow. It lives in one repo, guides one tool, and only helps the people working in that codebase. Nothing about your team travels with it.\n\nA CLAUDE.md for your whole team is the same idea made shared and portable: one context file every member's agents read before they answer, in every project and every tool, not just in one repository and not just for people who write code. It carries how the team ships, what it names things, who owns what, and the constraints that apply to everyone. Creed's Company plan is that file: one shared Company Creed with member roles, an activity view, and admin controls, built on plain Markdown the team owns. You keep the habit that a repo CLAUDE.md gave you, and you lift it out of a single repo so it works for the whole company.",
  body: [
    { type: "h2", text: "What a repo CLAUDE.md does well" },
    {
      type: "p",
      text: "A CLAUDE.md file sits in a repository and gives the agent working there the context it would otherwise have to guess: build and test commands, naming conventions, the architecture in a paragraph, the traps that bite newcomers. When an agent reads it first, its answers stop being generic and start matching how that project actually works.",
    },
    {
      type: "p",
      text: "It works because it is read before the work, not looked up during it. That is the same principle behind any context file: put the durable facts where the agent sees them first, and keep them short enough that they always get read.",
    },
    { type: "h2", text: "Where a repo CLAUDE.md stops" },
    {
      type: "p",
      text: "The limits are structural, not flaws. A CLAUDE.md is scoped to one thing, and a team is more than one thing.",
    },
    {
      type: "ul",
      items: [
        "Per repo: it guides agents inside that codebase and nowhere else. Your other repos, and your non-code work, do not see it.",
        "Per tool: it is read by coding agents in that project. It does not follow you into ChatGPT, a browser assistant, or a teammate's different setup.",
        "Coder-only: it assumes the reader works in the repo. Design, ops, support, and leadership never touch it, so their agents get none of it.",
        "No roles: a CLAUDE.md is just a file in the tree. There is no notion of who may change the shared context or how edits are reviewed.",
        "No proposal loop: it does not improve itself. Someone has to remember to edit it, and stale lines sit there until a human notices.",
      ],
    },
    {
      type: "p",
      text: "For a single project, none of that matters much. For a team that works across many repos and many tools, and includes people who never open a repo at all, it means the shared context lives in fragments, or does not exist.",
    },
    { type: "h2", text: "The upgrade: a shared Company Creed" },
    {
      type: "p",
      text: "A Company Creed keeps what a CLAUDE.md gets right and removes the limits. It is one shared context file every member's agents read before they answer, connected over MCP, so it travels across tools and projects instead of being pinned to one repo. It is not coder-only: the structure is the same for anyone on the team, and only the examples change.",
    },
    {
      type: "p",
      text: "It also adds the governance a bare file cannot have. Members have roles of Owner, Admin, and Member. Section permissions decide which roles can edit which parts. An activity view makes every change visible. And because it runs on Creed, agents propose narrow updates as they learn something durable, which an Owner or Admin approves, so the shared page stays current instead of going stale in a corner of a repo.",
    },
    { type: "h2", text: "Repo CLAUDE.md vs a Company context file" },
    {
      type: "table",
      caption: "A repo-level CLAUDE.md compared to a shared Company context file.",
      headers: ["Topic", "Repo CLAUDE.md", "Company context file"],
      rows: [
        ["Scope", "One repository", "The whole team, everywhere"],
        ["Tools that read it", "Coding agents in that repo", "Every member's connected agents over MCP"],
        ["Audience", "People working in the codebase", "Anyone on the team, coder or not"],
        ["Roles and permissions", "None", "Owner, Admin, Member with section permissions"],
        ["Change visibility", "Git history of one file", "Activity view of the shared Creed"],
        ["Stays current by", "Manual edits", "Agent proposals an admin approves"],
      ],
    },
    {
      type: "p",
      text: "A repo CLAUDE.md is still the better tool for one thing: project-specific detail that only matters inside that codebase. Keep it. A Company context file is not meant to absorb every repo's build quirks; it holds the durable, team-wide facts every agent should start from, wherever it is working. The two sit at different altitudes and work together.",
    },
    { type: "h2", text: "What it costs" },
    {
      type: "p",
      text: "Nothing. Creed's Company Creed is free, with roles, an activity view, and admin controls for as many members as you need. AI features run on the deployment's included key or on the company's own OpenRouter key (BYOK).",
    },
    {
      type: "p",
      text: "It is plain Markdown the team owns, so you can read it, edit it, export it, or delete it with no lock-in, the same way an individual owns a personal Creed. If your engineers already keep a CLAUDE.md, the mental model is familiar; the Company Creed just makes it shared, portable, and read by everyone's agents.",
    },
  ],
  faq: [
    {
      question: "What is a CLAUDE.md for a team?",
      answer:
        "It is a shared context file every member's AI reads before it answers, taking the CLAUDE.md idea beyond one repository. Instead of guiding one coding agent in one project, it carries team-wide facts to every member's agents across tools and projects.",
    },
    {
      question: "How is it different from a repo CLAUDE.md?",
      answer:
        "A repo CLAUDE.md is scoped to one codebase, read by coding agents in that repo, with no roles or self-updating. A Company context file is portable across tools, read by every member's agents, works for non-coders too, and adds roles, an activity view, and an approval loop.",
    },
    {
      question: "Should we keep our repo CLAUDE.md files?",
      answer:
        "Yes. A repo CLAUDE.md is the better place for project-specific detail that only matters inside that codebase. A Company context file holds the durable, team-wide facts every agent should start from wherever it works. They sit at different altitudes and complement each other.",
    },
    {
      question: "Does a team context file only help engineers?",
      answer:
        "No. Unlike a repo CLAUDE.md, a Company Creed uses the same structure for anyone on the team, so design, operations, support, and leadership benefit too. Only the examples change; every member's agents read the same shared page.",
    },
    {
      question: "How much does a Company Creed cost?",
      answer:
        "Nothing. It is free, with as many members as you need. AI features run on the deployment's included key or on the company's own OpenRouter key (BYOK).",
    },
  ],
  related: [
    { label: "A team context file", href: "/learn/team-context-file" },
    { label: "A CLAUDE.md for your life", href: "/learn/claude-md-for-your-life" },
    { label: "Connect Creed to Claude Code", href: "/learn/connect-creed-to-claude-code" },
    { label: "Creed for teams", href: "/company" },
  ],
};
