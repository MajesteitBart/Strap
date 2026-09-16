"use client";

// Local search and navigation. Connected agents provide feedback through proposals.
import { normalizeStrapAttribution } from "@/components/strap/brand-attribution";
import { useStrap } from "@/components/strap/strap-provider";
import { useTheme } from "@/components/strap/theme-provider";
import { BookTextIcon } from "@/components/ui/book-text";
import { ConnectIcon } from "@/components/ui/connect";
import { ContrastIcon } from "@/components/ui/contrast";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DownloadIcon } from "@/components/ui/download";
import { FileTextIcon } from "@/components/ui/file-text";
import { GitBranchIcon } from "@/components/ui/git-branch";
import { HistoryIcon } from "@/components/ui/history";
import { LogoutIcon } from "@/components/ui/logout";
import { PlusIcon } from "@/components/ui/plus";
import { SearchIcon } from "@/components/ui/search";
import { SettingsIcon } from "@/components/ui/settings";
import { fuzzyScore } from "@/lib/panel/fuzzy";
import { SETTINGS_SEARCH_COMMANDS } from "@/lib/panel/settings-search";
import { STRAP_FILE_NAME } from "@/lib/profile-file";
import { accentColorMap } from "@/lib/strap-data";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ForwardRefExoticComponent,
  type HTMLAttributes,
  type RefAttributes,
} from "react";

export const PANEL_OPEN_EVENT = "creed:panel-open";

type PanelProps = {
  onFileSection: (sectionId: string) => void;
  onFileProposal: (proposalId: string) => void;
  onAddSection: () => void;
  onOpenPush: () => void;
  onSetActivity: (open: boolean) => void;
};

type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};
type AnimatedIconComponent = ForwardRefExoticComponent<
  HTMLAttributes<HTMLDivElement> & {
    size?: number;
  } & RefAttributes<AnimatedIconHandle>
>;

type Command = {
  id: string;
  label: string;
  group: "Pages" | "Sections" | "Proposals" | "Settings" | "Actions";
  keywords: string[];
  icon?: AnimatedIconComponent;
  dot?: string;
  run: () => void;
};

const GROUP_ORDER: Command["group"][] = [
  "Pages",
  "Sections",
  "Proposals",
  "Settings",
  "Actions",
];
function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function PanelRowIcon({
  Icon,
  active,
}: {
  Icon: AnimatedIconComponent;
  active: boolean;
}) {
  const ref = useRef<AnimatedIconHandle>(null);
  useEffect(() => {
    if (active) ref.current?.startAnimation();
    else ref.current?.stopAnimation();
  }, [active]);
  return (
    <Icon
      ref={ref}
      size={14}
      className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center leading-none"
    />
  );
}

export function StrapPanel({
  onFileSection,
  onFileProposal,
  onAddSection,
  onOpenPush,
  onSetActivity,
}: PanelProps) {
  const router = useRouter();
  const { state, exportMarkdown, signOut } = useStrap();
  const { toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const liveSections = useMemo(
    () => state.sections.filter((section) => !section.archived),
    [state.sections],
  );
  const pendingProposals = useMemo(
    () => state.proposals.filter((proposal) => proposal.status === "pending"),
    [state.proposals],
  );
  const changeOpen = useCallback((next: boolean) => {
    setOpen(next);
    setQuery("");
    setActiveIndex(0);
  }, []);
  useEffect(() => {
    const launch = () => changeOpen(true);
    const key = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "k" ||
        event.altKey ||
        event.shiftKey ||
        event.repeat ||
        event.isComposing ||
        event.defaultPrevented
      )
        return;
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? "");
      if (typing && !event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      changeOpen(!open);
    };
    window.addEventListener(PANEL_OPEN_EVENT, launch);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener(PANEL_OPEN_EVENT, launch);
      window.removeEventListener("keydown", key);
    };
  }, [changeOpen, open]);
  const commands = useMemo<Command[]>(() => {
    return [
      {
        id: "page:file",
        label: "File",
        group: "Pages",
        keywords: ["editor", "creed", "sections", "proposals"],
        icon: FileTextIcon as AnimatedIconComponent,
        run: () => router.push("/file"),
      },
      {
        id: "page:connections",
        label: "Connections",
        group: "Pages",
        keywords: ["agents", "mcp", "clients", "connected"],
        icon: ConnectIcon as AnimatedIconComponent,
        run: () => router.push("/connections"),
      },
      {
        id: "page:settings",
        label: "Settings",
        group: "Pages",
        keywords: ["preferences", "options"],
        icon: SettingsIcon as AnimatedIconComponent,
        run: () => router.push("/settings"),
      },
      ...liveSections.map<Command>((section) => ({
        id: `section:${section.id}`,
        label: section.name,
        group: "Sections",
        keywords: [],
        dot: accentColorMap[section.accent],
        run: () => onFileSection(section.id),
      })),
      ...pendingProposals.map<Command>((proposal) => ({
        id: `proposal:${proposal.id}`,
        label: `${proposal.sectionName} · ${normalizeStrapAttribution(proposal.agentName)}`,
        group: "Proposals",
        keywords: [proposal.reason],
        dot: "var(--strap-success)",
        run: () => onFileProposal(proposal.id),
      })),
      ...(state.creedType !== "company"
        ? SETTINGS_SEARCH_COMMANDS.map<Command>(({ key, label, keywords }) => ({
            id: `settings:${key}`,
            label,
            group: "Settings",
            keywords: ["settings", ...keywords],
            icon: SettingsIcon as AnimatedIconComponent,
            run: () => router.push(`/settings#settings-${key}`),
          }))
        : []),
      // Section creation is owner/admin-only in company mode; hide it for members.
      ...(state.creedType !== "company" ||
      state.company?.myRole === "owner" ||
      state.company?.myRole === "admin"
        ? ([
            {
              id: "action:add-section",
              label: "Add section",
              group: "Actions",
              keywords: ["new section", "create section", "compose"],
              icon: PlusIcon as AnimatedIconComponent,
              run: () => onAddSection(),
            },
          ] as Command[])
        : []),
      {
        id: "action:push",
        label: "Push to GitHub",
        group: "Actions",
        keywords: ["push", "github", "sync", "commit", "publish"],
        icon: GitBranchIcon,
        run: () => onOpenPush(),
      },
      {
        id: "action:activity",
        label: "Activity",
        group: "Actions",
        keywords: ["activity", "history", "log", "changes", "recent edits"],
        icon: HistoryIcon as AnimatedIconComponent,
        run: () => onSetActivity(true),
      },
      {
        id: "action:export-creed",
        label: "Export Strap",
        group: "Actions",
        keywords: ["export", "download", "markdown", "backup"],
        icon: DownloadIcon as AnimatedIconComponent,
        run: () =>
          downloadFile(
            STRAP_FILE_NAME,
            exportMarkdown(),
            "text/markdown;charset=utf-8",
          ),
      },
      {
        id: "action:toggle-theme",
        label: "Toggle theme",
        group: "Actions",
        keywords: ["dark mode", "light mode", "appearance"],
        icon: ContrastIcon as AnimatedIconComponent,
        run: () => toggleTheme(),
      },
      {
        id: "action:docs",
        label: "Docs",
        group: "Actions",
        keywords: ["documentation", "help", "guide"],
        icon: BookTextIcon as AnimatedIconComponent,
        run: () => router.push("/docs"),
      },
      {
        id: "action:log-out",
        label: "Log out",
        group: "Actions",
        keywords: ["sign out", "logout"],
        icon: LogoutIcon as AnimatedIconComponent,
        run: () => void signOut(),
      },
    ];
  }, [
    exportMarkdown,
    liveSections,
    onAddSection,
    onFileProposal,
    onFileSection,
    onOpenPush,
    onSetActivity,
    pendingProposals,
    router,
    signOut,
    toggleTheme,
    state.creedType,
    state.company?.myRole,
  ]);

  const groups = useMemo(() => {
    const trimmed = query.trim();
    const scored = trimmed
      ? commands
          .map((command) => ({
            command,
            score: fuzzyScore(trimmed, command.label, command.keywords),
          }))
          .filter((entry) => entry.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((entry) => entry.command)
      : commands;
    return GROUP_ORDER.map((group) => ({
      label: group,
      items: scored.filter((command) => command.group === group),
    })).filter((group) => group.items.length > 0);
  }, [commands, query]);

  const flatResults = useMemo(
    () => groups.flatMap((group) => group.items),
    [groups],
  );

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);
  function run(command: Command) {
    changeOpen(false);
    command.run();
  }
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="max-w-[560px] gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Search Strap</DialogTitle>
        <div className="flex items-center gap-2.5 border-b border-[var(--strap-border)] px-4">
          <SearchIcon size={16} />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            aria-label="Search Strap"
            placeholder="Search or jump to…"
            spellCheck={false}
            autoComplete="off"
            className="h-[52px] w-full bg-transparent pr-8 text-[15px] outline-none"
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) =>
                  flatResults.length
                    ? (index +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        flatResults.length) %
                      flatResults.length
                    : 0,
                );
              }
              if (event.key === "Enter") {
                event.preventDefault();
                if (flatResults[activeIndex]) run(flatResults[activeIndex]);
              }
            }}
          />
        </div>
        <div
          ref={listRef}
          className="max-h-[360px] overflow-y-auto p-1.5 strap-scrollbar"
        >
          {groups.length === 0 ? (
            <p className="px-3 py-6 text-sm text-[var(--strap-text-secondary)]">
              No matches found.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <div className="px-2 py-2 text-xs text-[var(--strap-text-tertiary)]">
                  {group.label}
                </div>
                {group.items.map((command) => {
                  const index = flatResults.indexOf(command);
                  const active = index === activeIndex;
                  return (
                    <button
                      key={command.id}
                      type="button"
                      data-active={active}
                      onMouseMove={() => setActiveIndex(index)}
                      onClick={() => run(command)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left text-sm",
                        active && "bg-accent text-accent-foreground",
                      )}
                    >
                      {command.icon ? (
                        <PanelRowIcon Icon={command.icon} active={active} />
                      ) : command.dot ? (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: command.dot }}
                        />
                      ) : null}
                      <span className="truncate">{command.label}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
