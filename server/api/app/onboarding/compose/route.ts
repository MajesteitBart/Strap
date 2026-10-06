import { requireApiAuth } from "@/lib/api-auth";
import { recordAuditEvent } from "@/lib/audit-log";
import { checkRateLimit } from "@/lib/rate-limit";
import { mergeComposedSections } from "@/lib/onboarding/compile";
import { loadCreedState, persistCreedState } from "@/lib/strap-backend";
import { parseCreedMarkdown } from "@/lib/strap-markdown";

// Onboarding compose via copy-paste (replaces the old MCP compose_creed). The
// user pastes the Markdown Strap their assistant produced; we parse it and map
// the bodies onto their seed sections. Session-authed (not the MCP write token):
// onboarding never touches MCP, which stays a paid-only feature.
//
// Initialize-only: it runs only while the Strap is still the pristine seed (no
// section is agent-authored yet), so it can never wipe real edits. Parsing reuse
// is parseCreedMarkdown, which already runs markdownToRichHtml per body, so the
// resulting `content` is normalized, XSS-safe HTML - do NOT normalize it again.

const MAX_MARKDOWN = 100_000;
// parseCreedMarkdown fills an empty section body with this placeholder; treat it
// as "no content" so an empty heading keeps the seed draft rather than blanking.
const EMPTY_PLACEHOLDER = "Start shaping this section.";

// The prompt asks the assistant to wrap the Strap in one fenced code block. If
// the user pastes the whole reply (fence + any preamble), pull the fenced body
// so stray ``` markers don't get parsed as a code block; otherwise use as-is
// (covers users who copied just the code block, which drops the fences).
function stripCodeFence(input: string): string {
  const match = input.match(/```[a-zA-Z]*\n([\s\S]*?)\n```/);
  return match && match[1].trim() ? match[1] : input;
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;

  const verdict = checkRateLimit({
    scope: "onboarding-compose",
    identifier: auth.user.id,
    limit: 10,
    windowMs: 60_000,
  });
  if (!verdict.ok) {
    return Response.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(verdict.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const markdown =
    body && typeof body === "object" && typeof (body as { markdown?: unknown }).markdown === "string"
      ? (body as { markdown: string }).markdown
      : null;
  if (!markdown || !markdown.trim()) {
    return Response.json({ error: "Paste your Strap first." }, { status: 400 });
  }
  if (markdown.length > MAX_MARKDOWN) {
    return Response.json({ error: "That's too long to be a Strap." }, { status: 400 });
  }

  const result = await loadCreedState(auth.context, auth.user, {
    proposalLimit: 1,
    activityLimit: 1,
  });

  if (result.state.sections.length === 0) {
    return Response.json(
      { error: "Finish the onboarding questions first." },
      { status: 409 }
    );
  }
  // Pristine-window guard: only the seed (nothing agent-authored) can be
  // composed. A re-paste after composing returns already_composed so the client
  // can just advance to the preview instead of dead-ending.
  if (result.state.sections.some((section) => section.lastEditedType === "agent")) {
    return Response.json({ error: "already_composed" }, { status: 409 });
  }

  const parsed = parseCreedMarkdown(stripCodeFence(markdown));

  // Map parsed bodies onto the seed sections by id. parseCreedMarkdown normalizes
  // each heading to the same ids the seed uses, so this upgrades content while
  // keeping the seed spine (id/name/accent/template/permission). Unmatched seed
  // sections keep their draft; Constraints, Context and People are added when
  // the interview filled them; other pasted sections are ignored.
  const { sections: nextSections, matched } = mergeComposedSections(
    result.state.sections,
    parsed.sections,
    (content) => {
      const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      return !text || text === EMPTY_PLACEHOLDER;
    },
  );

  if (matched === 0) {
    // Nothing recognizable in the paste; write nothing and let the client show
    // an inline "that doesn't look right" message.
    return Response.json({ ok: false, matched: 0 }, { status: 200 });
  }

  const nextState = {
    ...result.state,
    lastSavedAt: Date.now(),
    sections: nextSections,
    proposals: [],
    mutationTick: result.state.mutationTick + 1,
  };

  await persistCreedState(auth.context, auth.user.id, nextState);

  void recordAuditEvent({
    userId: auth.user.id,
    action: "creed.composed",
    request,
    metadata: { matched },
  });

  return Response.json({ ok: true, matched, sections: nextSections });
}
