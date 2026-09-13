"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStrap } from "@/components/strap/strap-provider";
import { ShortcutKey } from "@/components/strap/shortcut-key";
import { ProfileAvatar } from "@/components/strap/profile-avatar";

const LAST_ACTIVE_CREED_KEY = "creed:last-active-creed";

// The Strap switcher, rendered as the file-screen header title. Shows the active
// Strap's name ("Connor Hepburn / Strap" for personal, "Bad Company / Strap" for
// a company) with a dropdown arrow to the right. When the user belongs to only
// one Strap there is no arrow and no menu - it renders as a plain title.
const TITLE_CLASS =
  "font-heading text-[1.22rem] font-medium tracking-[-0.03em] text-[var(--strap-text-primary)] md:text-[1.45rem]";

export function StrapSwitcher() {
  const { state, switchCreed } = useStrap();
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const [optimisticId, setOptimisticId] = useState<string | null>(null);
  const previousActiveIdRef = useRef<string | null>(null);

  const creeds = useMemo(() => state.creeds ?? [], [state.creeds]);
  const activeId = state.creedId ?? creeds.find((c) => c.type === "personal")?.id ?? creeds[0]?.id ?? null;
  const shownActiveId = optimisticId ?? activeId;
  const optimisticCreed = useMemo(
    () => creeds.find((creed) => creed.id === shownActiveId) ?? null,
    [creeds, shownActiveId],
  );
  const displayName = optimisticCreed
    ? optimisticCreed.type === "personal"
      ? state.user.name
      : optimisticCreed.name
    : state.creedType === "company"
      ? state.company?.creedName ?? "Company"
      : state.user.name;

  useEffect(() => {
    if (optimisticId && activeId === optimisticId) {
      setOptimisticId(null);
    }
  }, [activeId, optimisticId]);

  const switchTo = useCallback(
    async (creed: { id: string; needsSetup?: boolean }) => {
      if (creed.id === activeId && !creed.needsSetup) return;
      setSwitching(true);
      setOptimisticId(creed.id);
      try {
        // A company that hasn't finished setup routes into the onboarding flow
        // (which owns the gate/redirect). Set the active cookie first so onboarding
        // targets the right Strap, then navigate.
        if (creed.needsSetup) {
          const response = await fetch("/api/app/straps/activate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ creedId: creed.id }),
          });
          if (!response.ok) {
            const data = (await response.json().catch(() => ({}))) as { error?: string };
            toast.error(data.error ?? "Could not switch Strap.");
            setOptimisticId(null);
            setSwitching(false);
            return;
          }
          router.push("/onboarding/company");
          return;
        }

        // Instant, client-side swap: replaces provider state wholesale, no full
        // route refresh.
        const result = await switchCreed(creed.id);
        if (!result.ok) {
          toast.error(result.error ?? "Could not switch Strap.");
          setOptimisticId(null);
        }
        setSwitching(false);
      } catch {
        toast.error("Could not switch Strap.");
        setOptimisticId(null);
        setSwitching(false);
      }
    },
    [activeId, router, switchCreed],
  );

  useEffect(() => {
    if (!activeId) return;
    const previous = previousActiveIdRef.current;
    if (previous && previous !== activeId) {
      try {
        window.localStorage.setItem(LAST_ACTIVE_CREED_KEY, previous);
      } catch {}
    }
    previousActiveIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (creeds.length <= 1) return;

    function isEditable(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "c" && event.key !== "C") return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (event.isComposing || event.repeat || event.defaultPrevented) return;
      if (isEditable(event.target) || switching || !activeId) return;

      event.preventDefault();

      let targetId: string | null = null;
      try {
        const stored = window.localStorage.getItem(LAST_ACTIVE_CREED_KEY);
        if (stored && stored !== activeId && creeds.some((creed) => creed.id === stored)) {
          targetId = stored;
        }
      } catch {}

      if (!targetId) {
        const currentIndex = creeds.findIndex((creed) => creed.id === activeId);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % creeds.length : 0;
        targetId = creeds[nextIndex]?.id ?? null;
      }

      const target = targetId ? creeds.find((creed) => creed.id === targetId) : undefined;
      if (target) {
        void switchTo(target);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeId, creeds, switchTo, switching]);

  // One Strap (or none loaded): plain title, no dropdown.
  if (creeds.length <= 1) {
    return <div className={TITLE_CLASS}>{displayName} / Strap</div>;
  }

  return (
    <DropdownMenu>
      <div className="inline-flex items-center gap-2.5">
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Switch Strap"
            disabled={switching}
            // No card: aligned like the plain title, greyed on hover the same way
            // the brand mark dims (opacity), and the arrow points down by default,
            // flipping up while the menu is open.
            className="group/switcher inline-flex items-center gap-2 text-left transition-opacity duration-[160ms] hover:opacity-60 disabled:opacity-70"
          >
            <span className={TITLE_CLASS}>{displayName} / Strap</span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-[var(--strap-text-primary)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[state=open]/switcher:rotate-180"
              strokeWidth={2}
            />
          </button>
        </DropdownMenuTrigger>
        <ShortcutKey className="hidden md:inline-flex">C</ShortcutKey>
      </div>
      <DropdownMenuContent align="start" className="min-w-[264px] border-[var(--strap-border)] bg-[var(--strap-surface)] p-1.5">
        {creeds.map((creed) => {
          const label = creed.type === "personal" ? state.user.name : creed.name;
          const isActive = creed.id === shownActiveId;
          return (
            <DropdownMenuItem
              key={creed.id}
              disabled={switching}
              onSelect={() => {
                void switchTo(creed);
              }}
              className="flex items-center justify-between gap-3 rounded-sm px-3 py-2.5 text-[14px]"
            >
              <span className="flex min-w-0 items-center gap-2.5 text-[var(--strap-text-primary)]">
                <ProfileAvatar
                  kind={creed.type === "company" ? "company" : "person"}
                  name={label}
                  initials={creed.avatarInitials}
                  avatarUrl={creed.avatarUrl}
                  size="sm"
                />
                <span className="truncate">{label}</span>
              </span>
              {creed.needsSetup ? (
                <span
                  className="shrink-0 rounded-[6px] px-2 py-0.5 text-[11px] font-medium text-white"
                  style={{ backgroundColor: creed.type === "company" ? "#F59E0B" : "var(--strap-accent)" }}
                >
                  Set up
                </span>
              ) : isActive ? (
                <Check className="h-4 w-4 shrink-0 text-white" strokeWidth={1.8} />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** @deprecated Use StrapSwitcher. Retained for component-import compatibility. */
export const CreedSwitcher = StrapSwitcher;
