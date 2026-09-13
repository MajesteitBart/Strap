import type { Article } from "./types";

export const connectStrapToClaudeCode: Article = {
  slug: "connect-strap-to-claude-code",
  title: "Connect Strap to Claude Code",
  description:
    "Add Strap to Claude Code as an MCP server, authorize with OAuth, and Claude Code reads your context before it works. Here is the full setup and the read-and-propose loop.",
  cluster: "integration",
  datePublished: "2026-07-07",
  dateModified: "2026-07-07",
  lead:
    "To connect Strap to Claude Code, add it as an HTTP MCP server and authorize it once with OAuth. From a terminal, run the add command, then run the authorize step inside Claude Code and click Allow on the Strap consent screen while signed in to strap.bvdm.ai. There is no key to copy; the whole handshake is OAuth.\n\nOnce connected, Claude Code reads your Strap profile before meaningful work, so it starts already knowing your identity, goals, stack, and preferences. As it learns something durable about you, it proposes a narrow update you can approve, or writes directly if you have granted that. You verify the connection by listing the MCP tools and calling read_creed once.\n\nStrap is one personal context file that every AI reads before it answers. Wiring it into Claude Code means your coding agent stops working cold and starts from the same profile your other tools use.",
  body: [
    { type: "h2", text: "Step 1: Add Strap as an MCP server" },
    {
      type: "p",
      text: "In your terminal, add Strap to Claude Code as an HTTP MCP server. The server URL is https://strap.bvdm.ai/mcp.",
    },
    {
      type: "code",
      lang: "bash",
      code: "claude mcp add -t http strap https://strap.bvdm.ai/mcp",
    },
    {
      type: "p",
      text: "This registers a server named strap pointing at the Strap MCP endpoint. Nothing is authorized yet; that happens next.",
    },
    { type: "h2", text: "Step 2: Authorize with OAuth" },
    {
      type: "p",
      text: "Strap MCP uses OAuth, so there is no token to paste. Trigger the authorization from inside Claude Code:",
    },
    {
      type: "code",
      lang: "text",
      code: "/mcp",
    },
    {
      type: "ol",
      items: [
        "Run /mcp in Claude Code and choose to authorize the strap server.",
        "A browser opens to the Strap consent screen. Make sure you are signed in to strap.bvdm.ai.",
        "Click Allow to grant Claude Code access to your Strap.",
        "Return to Claude Code; the server now shows as connected.",
      ],
    },
    { type: "h2", text: "Step 3: Verify the connection" },
    {
      type: "p",
      text: "Confirm the tools are available and that Claude Code can read your profile. List the MCP tools, then have Claude Code call read_creed once. You should see your profile sections come back.",
    },
    {
      type: "ul",
      items: [
        "List MCP tools to confirm the creed_* tools and read_creed are present.",
        "Call read_creed once to load the profile and check the sections return.",
      ],
    },
    { type: "h2", text: "How the read and propose loop works" },
    {
      type: "p",
      text: "Once connected, Claude Code reads Strap before meaningful work rather than starting from nothing. It uses your Identity, Goals, Work, Preferences, and Routines to shape how it plans and writes. When it learns something durable, a sharper preference or a changed goal, it proposes a narrow update instead of silently rewriting your profile.",
    },
    {
      type: "ul",
      items: [
        "Read: Claude Code calls read_creed at the start of substantive work.",
        "Propose: as it learns a durable fact, it suggests one tight update to the relevant section.",
        "Approve: you accept the change, or trusted agents write directly if you allow it.",
      ],
    },
    { type: "h2", text: "Understanding get_write_policy" },
    {
      type: "p",
      text: "Whether an edit applies immediately or arrives as a proposal depends on your write policy. Claude Code can call get_write_policy to see which mode applies before it changes anything. In proposal mode, updates go through the creed_* tools as suggestions you approve. In direct-edit mode, a trusted agent can apply the change itself. This keeps you in control of what enters your profile.",
    },
    {
      type: "p",
      text: "Sections themselves are updated through the creed_* tools, so every change is scoped to a specific part of the profile rather than a wholesale rewrite. The result is a context file that stays sharp and current without becoming a scratchpad.",
    },
    { type: "h2", text: "What you get" },
    {
      type: "p",
      text: "With Strap connected, Claude Code no longer needs you to re-explain your role, stack, and preferences each session. It reads the same profile your other connected agents read, so your context is consistent across tools. It is plain Markdown you own, with export and delete anytime and no lock-in.",
    },
  ],
  faq: [
    {
      question: "How do I connect Strap to Claude Code?",
      answer:
        "Run claude mcp add -t http strap https://strap.bvdm.ai/mcp in your terminal, then run /mcp in Claude Code to authorize. A browser opens to the Strap consent screen; click Allow while signed in to strap.bvdm.ai.",
    },
    {
      question: "Is there an API key to copy?",
      answer:
        "No. Strap MCP uses OAuth, so there is nothing to paste. You authorize through a browser consent screen where you click Allow, and Claude Code handles the rest.",
    },
    {
      question: "How do I verify Strap is connected?",
      answer:
        "List the MCP tools in Claude Code to confirm read_creed and the creed_* tools are present, then call read_creed once. Your profile sections should come back.",
    },
    {
      question: "Will Claude Code change my profile without asking?",
      answer:
        "Only if you allow it. Claude Code can call get_write_policy to see whether edits apply directly or as proposals. In proposal mode, updates are suggestions you approve; in direct-edit mode, a trusted agent can apply them.",
    },
  ],
  related: [
    { label: "Connect Strap to ChatGPT", href: "/learn/connect-strap-to-chatgpt" },
    { label: "Connect Strap to Cursor", href: "/learn/connect-strap-to-cursor" },
    { label: "Share context between ChatGPT and Claude", href: "/learn/share-context-between-chatgpt-and-claude" },
    { label: "Read the docs", href: "/docs" },
  ],
};
