import type { Article } from "./types";

export const connectStrapToCursor: Article = {
  slug: "connect-strap-to-cursor",
  title: "Connect Strap to Cursor",
  description:
    "Add Strap as a remote MCP server in Cursor, authorize with OAuth, and Cursor reads your context before it plans or edits. Here are the steps and how to verify.",
  cluster: "integration",
  datePublished: "2026-07-07",
  dateModified: "2026-07-07",
  lead:
    "To connect Strap to Cursor, add it as a remote MCP server in Cursor's settings and authorize it once with OAuth. Point the server at https://strap.bvdm.ai/mcp, then complete authorization in the browser by clicking Allow on the Strap consent screen while signed in to strap.bvdm.ai. There is no key to copy; the handshake is OAuth.\n\nOnce connected, Cursor can read your Strap profile before it plans or edits, so it starts already knowing your role, stack, goals, and preferences rather than working cold. As it learns something durable about you, it can propose a narrow update you approve.\n\nStrap is one personal context file that every AI reads before it answers. In Cursor, that means the same profile your other agents use also shapes how Cursor reasons about your code. You verify the connection by confirming the tools are available and calling read_creed once.",
  body: [
    { type: "h2", text: "Step 1: Add a remote MCP server in Cursor" },
    {
      type: "p",
      text: "Open Cursor's settings and find the MCP servers section. Add a new remote MCP server and point it at the Strap endpoint:",
    },
    {
      type: "code",
      lang: "text",
      code: "https://strap.bvdm.ai/mcp",
    },
    {
      type: "p",
      text: "Cursor supports remote MCP servers, so you are adding Strap as a connector rather than running anything locally. Save the server once the URL is set.",
    },
    { type: "h2", text: "Step 2: Authorize in the browser" },
    {
      type: "p",
      text: "Strap MCP uses OAuth, so there is nothing to paste. When Cursor prompts you to authorize, it opens the Strap consent screen in your browser.",
    },
    {
      type: "ol",
      items: [
        "Start the authorization for the Strap server from Cursor's MCP settings.",
        "A browser opens to the Strap consent screen; sign in to strap.bvdm.ai if needed.",
        "Click Allow to grant Cursor access to your Strap.",
        "Return to Cursor; the server should now show as connected.",
      ],
    },
    { type: "h2", text: "Step 3: Verify with read_creed" },
    {
      type: "p",
      text: "Confirm Cursor can reach your profile before you rely on it.",
    },
    {
      type: "ul",
      items: [
        "Check that the Strap server appears connected and its tools are listed.",
        "Ask Cursor to call read_creed once and confirm your profile sections return.",
      ],
    },
    { type: "h2", text: "Cursor reading your context before it works" },
    {
      type: "p",
      text: "The value of connecting Strap shows up before Cursor writes a line. When Cursor reads your profile at the start of substantive work, it plans and edits with your context in hand: your stack from Work, your current direction from Goals, and how you like things done from Preferences. That means fewer wrong assumptions and less time spent correcting output that ignored what you already know.",
    },
    {
      type: "p",
      text: "Because the read happens before planning, the context steers the approach, not just the wording. Cursor is not guessing at conventions you have already settled; it is starting from them.",
    },
    { type: "h2", text: "How updates stay under your control" },
    {
      type: "p",
      text: "As Cursor learns something durable about you, it can propose a narrow update to the relevant section rather than rewriting your profile. Updates flow through the creed_* tools and are scoped to specific sections. Whether an edit applies directly or arrives as a proposal depends on your write policy, which an agent can check with get_write_policy before changing anything.",
    },
    { type: "h2", text: "One profile, every tool" },
    {
      type: "p",
      text: "The profile Cursor reads is the same one Claude Code, ChatGPT, and your other connected agents read. Your context does not fork per tool. It is plain Markdown you own, with export and delete anytime and no lock-in, and GitHub integration for version control if you want it.",
    },
  ],
  faq: [
    {
      question: "How do I connect Strap to Cursor?",
      answer:
        "In Cursor's settings, add a remote MCP server pointing to https://strap.bvdm.ai/mcp, then authorize in the browser by clicking Allow on the Strap consent screen while signed in to strap.bvdm.ai.",
    },
    {
      question: "Is there a token to paste into Cursor?",
      answer:
        "No. Strap MCP uses OAuth, so authorization happens through a browser consent screen where you click Allow. There is nothing to copy.",
    },
    {
      question: "When does Cursor read my Strap?",
      answer:
        "Cursor reads your profile before it plans or edits, so your role, stack, goals, and preferences shape its approach from the start rather than after you correct it. You can confirm the read by asking it to call read_creed once.",
    },
    {
      question: "Will Cursor edit my profile on its own?",
      answer:
        "Only if you allow it. Cursor can check get_write_policy to see whether edits apply directly or as proposals. In proposal mode, updates are suggestions you approve; in direct-edit mode, a trusted agent can apply them through the creed_* tools.",
    },
  ],
  related: [
    { label: "Connect Strap to Claude Code", href: "/learn/connect-strap-to-claude-code" },
    { label: "Connect Strap to ChatGPT", href: "/learn/connect-strap-to-chatgpt" },
    { label: "Sync AI memory across tools", href: "/learn/sync-ai-memory-across-tools" },
    { label: "Read the docs", href: "/docs" },
  ],
};
