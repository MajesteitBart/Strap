"use client";

import { Plus } from "lucide-react";
import { IntegrationGlyph } from "@/components/strap/brand";
import { AnimatedIconButton } from "@/components/strap/animated-icon-action";
import { AnimatedCheckmark } from "@/components/ui/animated-checkmark";
import { CopyIcon } from "@/components/ui/copy";
import type { AgentIconKind } from "@/lib/strap-data";

// The onboarding "copy the compose prompt" card, shared by both the personal
// and company onboarding flows so they stay identical. Both build a Strap the
// same way (paste the prompt into any assistant, get markdown back), and both
// have the same model access, so there is one card - update it here and both
// update. Callers own the headline/lede above it and pass the copy handler.

const PROMPT_GLYPH_KINDS: AgentIconKind[] = [
  "chatgpt",
  "claude",
  "claudecode",
  "codex",
  "cursor",
  "replit",
  "grok",
  "hermes",
  "openclaw",
  "opencode",
];

export function ComposePromptCard({
  copied,
  onCopy,
}: {
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="mx-auto mt-9 flex w-full max-w-lg flex-col rounded-lg border border-[var(--strap-border)] bg-[var(--strap-surface)] p-5 text-left">
      <div className="flex flex-wrap items-center gap-2.5">
        {PROMPT_GLYPH_KINDS.map((kind) => (
          <IntegrationGlyph
            key={kind}
            kind={kind}
            framed={false}
            className="h-8 w-8 shrink-0"
            assetClassName="h-8 w-8"
          />
        ))}
        <Plus strokeWidth={2} className="h-8 w-8 shrink-0 p-[7px] text-[var(--strap-text-primary)]" />
      </div>
      <p className="mt-4 text-[13px] leading-6 text-[var(--strap-text-secondary)]">
        Paste this prompt into any AI. It replies with a markdown Strap you paste back into Strap on
        the next page.
      </p>
      <div className="mt-4">
        <AnimatedIconButton
          type="button"
          icon={CopyIcon}
          showIcon={!copied}
          className="strap-copy-cycle min-w-[116px] justify-center rounded-md px-4 text-white"
          onClick={onCopy}
        >
          {copied ? (
            <>
              <AnimatedCheckmark className="h-4 w-4" size={16} />
              Copied
            </>
          ) : (
            "Copy prompt"
          )}
        </AnimatedIconButton>
      </div>
    </div>
  );
}
