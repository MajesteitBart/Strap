import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { resolveAiCredential, resolveCompanyAiCredential } from "@/lib/ai/credits";
import { streamOpenRouter } from "@/lib/ai/openrouter";
import { recordAiUsage } from "@/lib/ai/persistence";
import {
  buildTabContext,
  buildTabSystemPrompt,
  buildTabUserPrompt,
  TAB_MAX_AFTER_CHARS,
  TAB_MAX_BEFORE_CHARS,
  type TabMode,
} from "@/lib/ai/tab";
import { loadActiveStrapState } from "@/lib/strap-backend";
import { resolveActiveStrap } from "@/lib/strap-context";
import { sectionBodyMarkdown } from "@/lib/strap-data";
import { checkRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/observability";

// Tab autocomplete: one explicit press, one streamed suggestion. The route
// streams raw completion text (text/plain) so the ghost renders from the first
// token; usage is recorded after the stream resolves, tagged feature "tab".
// Approve / reject / keep typing never reach this route, so only the press
// itself is metered.

export const maxDuration = 60;

// Generous interactive ceiling: a fast typist chaining suggestions, not a bot.
const TAB_RATE_LIMIT = 30;
const TAB_RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const verdict = checkRateLimit({
    scope: "ai-tab",
    identifier: auth.user.id,
    limit: TAB_RATE_LIMIT,
    windowMs: TAB_RATE_WINDOW_MS,
  });
  if (!verdict.ok) {
    return NextResponse.json(
      { error: "Slow down a moment, then try Tab again." },
      { status: 429, headers: { "Retry-After": String(verdict.retryAfterSeconds) } },
    );
  }

  const activeCreed = await resolveActiveStrap(auth.supabase, auth.user);
  const companyEntry = activeCreed?.creeds.find(
    (c) => c.id === activeCreed.creedId && c.type === "company",
  );
  const companyId = companyEntry ? activeCreed!.creedId : undefined;

  let payload: {
    messages: Array<{ role: "system" | "user"; content: string }>;
    apiKey: string;
    modelId: string;
    mode: "credits" | "byok";
    maxTokens: number;
  };
  try {
    const body = (await request.json()) as {
      sectionId?: unknown;
      before?: unknown;
      after?: unknown;
      mode?: unknown;
    };
    const sectionId = typeof body.sectionId === "string" ? body.sectionId.trim() : "";
    const before = typeof body.before === "string" ? body.before : "";
    const after = typeof body.after === "string" ? body.after : "";
    const mode: TabMode = body.mode === "draft" ? "draft" : "complete";
    if (
      !sectionId ||
      sectionId.length > 128 ||
      before.length > TAB_MAX_BEFORE_CHARS * 2 ||
      after.length > TAB_MAX_AFTER_CHARS * 2
    ) {
      return NextResponse.json({ error: "Missing or oversized request." }, { status: 400 });
    }

    const { state } = await loadActiveStrapState(auth.supabase, auth.user, activeCreed);
    const target = state.sections.find(
      (section) => section.id === sectionId && !section.archived,
    );
    if (!target) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    const context = buildTabContext(
      state.sections
        .filter((section) => !section.archived)
        .map((section) => ({
          id: section.id,
          name: section.name,
          content: sectionBodyMarkdown(section),
        })),
      sectionId,
    );

    const credential = companyId
      ? await resolveCompanyAiCredential(companyId, "tab", auth.user.id)
      : await resolveAiCredential(auth.supabase, auth.user.id, "tab");

    payload = {
      messages: [
        { role: "system", content: buildTabSystemPrompt() },
        {
          role: "user",
          content: buildTabUserPrompt({
            context,
            sectionName: target.name,
            before,
            after,
            mode,
          }),
        },
      ],
      apiKey: credential.apiKey,
      modelId: credential.modelId,
      mode: credential.mode,
      // Headroom over the visible completion: reasoning models spend some of
      // this budget on (excluded) reasoning before the content arrives.
      maxTokens: mode === "draft" ? 400 : 320,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "That didn't go through. Try again";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const p = payload;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const result = await streamOpenRouter({
          apiKey: p.apiKey,
          modelId: p.modelId,
          credentialMode: p.mode,
          maxTokens: p.maxTokens,
          temperature: 0.3,
          timeoutMs: 25000,
          // Tab lives or dies on time-to-first-token, so route to the fast
          // silicon explicitly. Measured 2026-07-12 on gpt-oss-120b:
          // Cerebras ~1600 tok/s (340ms TTFT), SambaNova ~1000, Groq ~520.
          // Fallbacks stay on for outages, throughput-sorted. BYOK keys are
          // often provider-restricted and run a different (first-party) model,
          // so they skip the host pinning and just take the fastest allowed.
          providerPreferences:
            p.mode === "byok"
              ? { sort: "throughput" }
              : {
                  order: ["cerebras", "sambanova", "groq"],
                  allow_fallbacks: true,
                  sort: "throughput",
                },
          // Reasoning models spend completion tokens on hidden reasoning by
          // default; at Tab's small budget that can consume everything and
          // return empty content after seconds of silence. Keep it minimal
          // and out of the stream.
          reasoning: { effort: "low", exclude: true },
          signal: request.signal,
          messages: p.messages,
          onDelta: (chunk) => {
            try {
              controller.enqueue(encoder.encode(chunk));
            } catch {
              // Client already dismissed the ghost; keep reading so usage
              // recording still sees the true token counts.
            }
          },
        });

        // Record the real usage once the suggestion exists. Dismissed ghosts
        // were still generated, so they still count.
        try {
          await recordAiUsage({
            client: auth.supabase,
            userId: auth.user.id,
            creedId: companyId,
            feature: "tab",
            modelId: p.modelId,
            modelQuality: result.modelQuality,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            costUsd: result.costUsd,
            chargedMicroUsd: Math.round(result.costUsd * 1_000_000),
            aiMode: p.mode,
          });
        } catch {
          // Best-effort.
        }
      } catch (error) {
        // An empty or failed stream simply yields no ghost: the client treats
        // an empty body as "no suggestion" and returns to idle silently. A
        // user-initiated abort is expected, not an error.
        if (!request.signal.aborted) {
          const message = error instanceof Error ? error.message : "unknown";
          if (message === "OpenRouter returned no content") {
            log.warn("ai_tab_empty_completion", {
              userId: auth.user.id,
              modelId: p.modelId,
            });
          } else {
            log.error("ai_tab_stream_failed", { userId: auth.user.id, message });
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
