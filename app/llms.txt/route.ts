import { getSiteUrl } from "@/lib/supabase/env";
import { BRAND_DESCRIPTION, BRAND_TAGLINE } from "@/lib/marketing/brand";
import { PRICING_ONE_LINER } from "@/lib/marketing/pricing";
import { learnArticles } from "@/lib/marketing/learn";

// Serves /llms.txt - the emerging convention that gives AI crawlers a clean,
// plain-text map of the site's most citable pages and a one-paragraph summary
// of what Strap is. Built from the deploy origin so links resolve correctly.
// The full plain-text content lives at /llms-full.txt (linked below); coding
// agents like Claude Code and Cursor fetch these directly.
export const dynamic = "force-static";

export function GET() {
  const base = getSiteUrl().replace(/\/$/, "");

  const guides = learnArticles
    .map((a) => `- [${a.title}](${base}/learn/${a.slug}): ${a.description}`)
    .join("\n");

  const body = `# Strap

> ${BRAND_TAGLINE} ${BRAND_DESCRIPTION.slice(BRAND_TAGLINE.length).trim()}

Full plain-text content: ${base}/llms-full.txt

## About

- [What is a personal context file?](${base}/learn/what-is-a-personal-context-file): The category explained - what goes in the file, how agents keep it current, and how it differs from a chatbot's memory.
- [Examples](${base}/examples): Concrete moments where one shared file changes the answer, across everyday life, health, boundaries, building, writing, research, and ownership.
- [Home](${base}/home): What Strap is and how it works.
- [Pricing](${base}/pricing): Plans and access.
- [Docs](${base}/docs): Setting up Strap, connecting agents, and keeping context useful over time.
- [Stack](${base}/stack): The technology Strap runs on.

## Details

A personal context file is one structured profile that describes who you are and how you want AI to respond. Strap organizes it into ten sections: Identity, Goals, Work, Preferences, and Routines as the always-on core, plus optional Beliefs, Constraints, People, Health, and Context.

Agents connect over MCP with browser OAuth, device authorization, or a scoped headless API key. They read the file before answering, then propose narrowly scoped updates that you approve. The Strap CLI exposes the same live MCP tools in a terminal.

Strap also ships a per-profile Vault for external API keys. Secret values remain server-side and are revealed only through an explicit authorized action. Skills, environments, and agent manifests are roadmap resources, not shipped product features.

Strap works for one person or a whole team. The Company plan adds one shared Company Strap that every member's agents read, with member roles, an activity view across the team, and admin controls.

## Pricing

${PRICING_ONE_LINER}

## Guides

${guides}
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
