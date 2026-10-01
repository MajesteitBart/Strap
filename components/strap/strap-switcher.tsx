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
import type { StrapState, StrapSwitcherItem } from "@/lib/strap-data";
import { cn } from "@/lib/utils";

const LAST_ACTIVE_CREED_KEY = "creed:last-active-creed";

// The active Strap decides what every app page shows, so the switcher lives in
// the sidebar shell (StrapSwitcher) and the C shortcut works on every page.
// Page headers render the active Strap's name as plain text (StrapTitle).
const TITLE_CLASS =
  "font-heading text-[1.22rem] font-semibold tracking-[-0.03em] text-[var(--strap-text-primary)] md:text-[1.45rem]";

// Pages with unsaved work register a guard; a switch only proceeds when every
// guard returns true (each guard may ask the user to confirm).
const switchGuards = new Set<{ current: () => boolean }>();

export function useStrapSwitchGuard(guard: () => boolean) {
  const guardRef = useRef(guard);
  useEffect(() => {
    guardRef.current = guard;
  });
  useEffect(() => {
    switchGuards.add(guardRef);
    return () => {
      switchGuards.delete(guardRef);
    };
  }, []);
}

function mayLeaveActiveStrap() {
  for (const guard of switchGuards) {
    if (!guard.current()) return false;
  }
  return true;
}

function strapLabel(creed: StrapSwitcherItem, state: StrapState) {
  return creed.type === "personal" ? state.user.name : creed.name;
}

function activeStrapName(state: StrapState, creed: StrapSwitcherItem | null) {
  if (creed) return strapLabel(creed, state);
  return state.creedType === "company"
    ? (state.company?.creedName ?? "Company")
    : state.user.name;
}

/** The active Strap's name as a page heading ("Bvdm / Strap"). */
export function StrapTitle() {
  const { state } = useStrap();
  const creed =
    state.creeds?.find((item) => item.id === state.creedId) ?? null;
  return (
    <div className={TITLE_CLASS}>{activeStrapName(state, creed)} / Strap</div>
  );
}

/**
 * Sidebar Strap switcher. Renders nothing for users with a single Strap. The
 * collapsed rail (mobile, or desktop after S) shows only the Strap's avatar.
 */
export function StrapSwitcher({ collapsed }: { collapsed: boolean }) {
  const { state, switchCreed } = useStrap();
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const [optimisticId, setOptimisticId] = useState<string | null>(null);
  const previousActiveIdRef = useRef<string | null>(null);
  const closedByPointerRef = useRef(false);

  const creeds = useMemo(() => state.creeds ?? [], [state.creeds]);
  const activeId =
    state.creedId ??
    creeds.find((c) => c.type === "personal")?.id ??
    creeds[0]?.id ??
    null;
  const shownActiveId = optimisticId ?? activeId;
  const shownCreed = creeds.find((creed) => creed.id === shownActiveId) ?? null;
  const displayName = activeStrapName(state, shownCreed);

  useEffect(() => {
    if (optimisticId && activeId === optimisticId) {
      setOptimisticId(null);
    }
  }, [activeId, optimisticId]);

  const switchTo = useCallback(
    async (creed: { id: string; needsSetup?: boolean }) => {
      if (creed.id === activeId && !creed.needsSetup) return;
      if (!mayLeaveActiveStrap()) return;
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
            const data = (await response.json().catch(() => ({}))) as {
              error?: string;
            };
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
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "c" && event.key !== "C") return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
        return;
      if (event.isComposing || event.repeat || event.defaultPrevented) return;
      if (isEditable(event.target) || switching || !activeId) return;

      event.preventDefault();

      let targetId: string | null = null;
      try {
        const stored = window.localStorage.getItem(LAST_ACTIVE_CREED_KEY);
        if (
          stored &&
          stored !== activeId &&
          creeds.some((creed) => creed.id === stored)
        ) {
          targetId = stored;
        }
      } catch {}

      if (!targetId) {
        const currentIndex = creeds.findIndex((creed) => creed.id === activeId);
        const nextIndex =
          currentIndex >= 0 ? (currentIndex + 1) % creeds.length : 0;
        targetId = creeds[nextIndex]?.id ?? null;
      }

      const target = targetId
        ? creeds.find((creed) => creed.id === targetId)
        : undefined;
      if (target) {
        void switchTo(target);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeId, creeds, switchTo, switching]);

  if (creeds.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Switch Strap (${displayName} is active)`}
          disabled={switching}
          className={cn(
            "group/switcher mx-auto flex h-8 w-8 items-center justify-center rounded-sm outline-none transition-colors duration-150 hover:bg-[var(--strap-surface-raised)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-70 data-[state=open]:bg-[var(--strap-surface-raised)]",
            !collapsed &&
              "lg:mx-0 lg:h-auto lg:w-full lg:justify-start lg:gap-2 lg:py-1.5 lg:pl-[7px] lg:pr-2",
          )}
        >
          <ProfileAvatar
            kind={shownCreed?.type === "company" ? "company" : "person"}
            name={displayName}
            initials={shownCreed?.avatarInitials}
            avatarUrl={shownCreed?.avatarUrl}
            size="sm"
          />
          <span
            className={cn(
              "hidden min-w-0 items-center gap-1",
              !collapsed && "lg:flex lg:flex-1",
            )}
          >
            <span className="truncate text-left text-sm font-medium text-[var(--strap-text-primary)]">
              {displayName}
            </span>
            <ChevronDown
              className="h-3 w-3 shrink-0 text-[var(--strap-text-tertiary)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/switcher:text-[var(--strap-text-primary)] group-data-[state=open]/switcher:rotate-180"
              strokeWidth={2}
            />
          </span>
          <ShortcutKey className={cn("hidden", !collapsed && "lg:inline-flex")}>
            C
          </ShortcutKey>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 border-[var(--strap-frame)] bg-[var(--strap-surface)] p-1.5"
        onPointerDown={() => {
          closedByPointerRef.current = true;
        }}
        onKeyDown={() => {
          closedByPointerRef.current = false;
        }}
        onCloseAutoFocus={(event) => {
          // Return focus to the trigger for keyboard users only; after a mouse
          // pick it would leave a focus ring on the sidebar until the next click.
          if (closedByPointerRef.current) event.preventDefault();
          closedByPointerRef.current = false;
        }}
      >
        {creeds.map((creed) => {
          const label = strapLabel(creed, state);
          const isActive = creed.id === shownActiveId;
          return (
            <DropdownMenuItem
              key={creed.id}
              disabled={switching}
              onSelect={() => {
                void switchTo(creed);
              }}
              className="flex items-center justify-between gap-3 rounded-sm px-2.5 py-2"
            >
              <span className="flex min-w-0 items-center gap-2.5 text-[var(--strap-text-primary)]">
                <ProfileAvatar
                  kind={creed.type === "company" ? "company" : "person"}
                  name={label}
                  initials={creed.avatarInitials}
                  avatarUrl={creed.avatarUrl}
                  size="sm"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[14px] leading-5">{label}</span>
                  <span className="text-[12px] leading-4 text-[var(--strap-text-tertiary)]">
                    {creed.type === "company" ? "Company" : "Personal"}
                  </span>
                </span>
              </span>
              {creed.needsSetup ? (
                <span
                  className="shrink-0 rounded-[6px] px-2 py-0.5 text-[11px] font-medium text-white!"
                  style={{
                    backgroundColor:
                      creed.type === "company"
                        ? "var(--strap-caution-fill)"
                        : "var(--strap-accent)",
                  }}
                >
                  Set up
                </span>
              ) : isActive ? (
                <Check
                  className="h-4 w-4 shrink-0 text-[var(--strap-text-primary)]"
                  strokeWidth={1.8}
                />
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
