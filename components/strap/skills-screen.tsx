"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowDownToLine,
  Check,
  Copy,
  FileCode2,
  FolderUp,
  History,
  Plus,
  RefreshCw,
  Search,
  Terminal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStrap } from "@/components/strap/strap-provider";
import { StrapSwitcher } from "@/components/strap/strap-switcher";
import { cn } from "@/lib/utils";
import {
  encodeSkillFile,
  fileBytes,
  MAX_SKILL_BYTES,
  MAX_SKILL_FILES,
  validateSkillBundle,
  validateSkillPath,
  type SkillBundle,
  type SkillFile,
  type SkillSummary,
  type StoredSkill,
} from "@/packages/strap/src/skills/bundle";

type Draft = {
  name: string;
  baseRevision: number;
  files: SkillFile[];
  archived: boolean;
};
const STARTER =
  "---\nname: my-skill\ndescription: Describe when an agent should use this skill.\n---\n\n# My skill\n\nWrite the steps your agent should follow.\n";
const FRAME =
  "rounded-sm border border-[var(--strap-frame)] bg-[var(--strap-surface)]";

function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2) + "\n"], {
      type: "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.strap-skill.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || "Could not load the skill library.");
  return body as T;
}

function DeviceSetup() {
  const [target, setTarget] = useState("codex");
  const [global, setGlobal] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const command = `npx @bvdm/strap@0.2.0 skills sync --target ${target}${global ? " --global" : ""}`;
  return (
    <details className={cn(FRAME, "group mt-6")}>
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 font-medium focus-visible:outline-2 focus-visible:outline-[var(--strap-skills)]">
        <Terminal size={17} /> Set up a device or agent{" "}
        <span className="ml-auto font-mono text-xs text-[var(--strap-text-secondary)]">
          CLI + MCP
        </span>
      </summary>
      <div className="border-t border-[var(--strap-border)] p-4 sm:p-5">
        <p className="max-w-2xl text-sm leading-6 text-[var(--strap-text-secondary)]">
          Run this on each device. Sign in and choose this profile when
          prompted. Sync downloads shared skills and publishes changes to skills
          you already manage. It stops when edits conflict.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            Agent{" "}
            <select
              aria-label="Agent skill directory"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className="rounded-sm border border-[var(--strap-frame)] bg-[var(--strap-surface)] p-2"
            >
              <option value="codex">Codex / .agents</option>
              <option value="claude">Claude Code</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={global}
              onChange={(event) => setGlobal(event.target.checked)}
            />{" "}
            All projects on this device
          </label>
        </div>
        <div className="mt-3 flex items-start gap-2 border border-[var(--strap-border)] bg-[var(--strap-surface-muted)] p-3">
          <code className="min-w-0 flex-1 break-all font-mono text-xs leading-6">
            {command}
          </code>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Copy sync command"
            onClick={() => {
              setCopyError(false);
              if (!navigator.clipboard) {
                setCopyError(true);
                return;
              }
              void navigator.clipboard
                .writeText(command)
                .then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                })
                .catch(() => setCopyError(true));
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </Button>
        </div>
        {copyError && (
          <p role="status" className="mt-2 text-xs">
            Select and copy the command above. Clipboard access is unavailable.
          </p>
        )}
        <p className="mt-3 text-xs leading-5 text-[var(--strap-text-secondary)]">
          Already connected to another profile? Run <code>strap logout</code>,
          then <code>strap login</code> and select this profile. Use a separate
          directory for each profile. Pass <code>--dir PATH</code> for another
          location, or <code>--dry-run</code> to preview changes. Sync keeps
          replaced files in a backup folder outside the agent’s skills
          directory.
        </p>
        <p className="mt-4 text-sm leading-6">
          For agents connected through{" "}
          <Link href="/connections" className="underline underline-offset-4">
            MCP
          </Link>
          , ask them to list your Strap skills and read the ones relevant to the
          task. They can use instructions and fetch supporting files without a
          local installation.
        </p>
      </div>
    </details>
  );
}

export function SkillsScreen() {
  const { state } = useStrap();
  if (!state.creedId)
    return (
      <div className="p-8">Choose a profile to open its skill library.</div>
    );
  return (
    <SkillLibrary
      key={state.creedId}
      strapId={state.creedId}
      company={state.creedType === "company"}
    />
  );
}

function SkillLibrary({
  strapId,
  company,
}: {
  strapId: string;
  company: boolean;
}) {
  const [items, setItems] = useState<SkillSummary[]>([]);
  const [storageBytes, setStorageBytes] = useState<number | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [folderPermissionsPending, setFolderPermissionsPending] = useState(false);
  const [filePath, setFilePath] = useState("SKILL.md");
  const [versions, setVersions] = useState<SkillSummary[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [addingFile, setAddingFile] = useState(false);
  const folderRef = useRef<HTMLInputElement>(null);
  const bundleRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const mounted = useRef(true);
  const query = `strapId=${encodeURIComponent(strapId)}`;

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const library = await request<{
        skills: SkillSummary[];
        canManage: boolean;
        storageBytes: number;
      }>(`/api/app/skills?strapId=${encodeURIComponent(strapId)}`, { signal });
      if (!mounted.current) return;
      setItems(library.skills);
      setCanManage(library.canManage);
      setStorageBytes(library.storageBytes ?? null);
    },
    [strapId],
  );

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void load(controller.signal)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error ? reason.message : "Could not load skills.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      mounted.current = false;
      controller.abort();
    };
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const confirmLink = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.download ||
        (link.target && link.target !== "_self")
      )
        return;
      const target = new URL(link.href, window.location.href);
      if (
        target.origin === window.location.origin &&
        target.pathname === window.location.pathname &&
        target.search === window.location.search
      )
        return;
      if (!window.confirm("Discard the changes in this draft?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", confirmLink, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", confirmLink, true);
    };
  }, [dirty]);

  function mayLeave() {
    return !dirty || window.confirm("Discard the changes in this draft?");
  }
  function fail(reason: unknown) {
    if (mounted.current)
      setError(
        reason instanceof Error
          ? reason.message
          : "The skill operation failed.",
      );
  }

  async function openSkill(name: string) {
    if (busy || !mayLeave()) return;
    const id = ++requestId.current;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const value = await request<{
        skill: StoredSkill;
        versions: SkillSummary[];
      }>(`/api/app/skills/${encodeURIComponent(name)}?${query}`);
      if (!mounted.current || id !== requestId.current) return;
      setDraft({
        name,
        baseRevision: value.skill.revision,
        files: value.skill.files,
        archived: value.skill.archived,
      });
      setVersions(value.versions);
      setFilePath("SKILL.md");
      setDirty(false);
      setFolderPermissionsPending(false);
      setHistoryOpen(false);
    } catch (reason) {
      fail(reason);
    } finally {
      if (mounted.current && id === requestId.current) setBusy(false);
    }
  }

  function newSkill() {
    if (!mayLeave()) return;
    setDraft({
      name: "my-skill",
      baseRevision: 0,
      files: [
        {
          path: "SKILL.md",
          content: STARTER,
          encoding: "utf8",
          executable: false,
        },
      ],
      archived: false,
    });
    setFilePath("SKILL.md");
    setVersions([]);
    setDirty(true);
    setFolderPermissionsPending(false);
    setError("");
    setNotice("");
    setHistoryOpen(false);
  }

  async function importFiles(files: FileList | null, json = false) {
    if (!files?.length || !mayLeave()) return;
    setError("");
    setNotice("");
    try {
      if (
        files.length > MAX_SKILL_FILES ||
        Array.from(files).reduce((size, file) => size + file.size, 0) >
          (json ? 12 * 1024 * 1024 : MAX_SKILL_BYTES)
      )
        throw new Error(
          "Choose one skill folder with up to 128 files and 2 MiB in total.",
        );
      let bundle: SkillBundle;
      if (json) {
        bundle = validateSkillBundle(JSON.parse(await files[0].text()));
      } else {
        const entries = await Promise.all(
          Array.from(files).map(async (file) => {
            const path =
              file.webkitRelativePath.split("/").slice(1).join("/") ||
              file.name;
            return encodeSkillFile(
              path,
              new Uint8Array(await file.arrayBuffer()),
            );
          }),
        );
        bundle = validateSkillBundle({ files: entries });
      }
      if (!mounted.current) return;
      const existing = items.find((item) => item.name === bundle.name);
      setDraft({
        name: bundle.name,
        files: bundle.files,
        baseRevision: existing?.revision ?? 0,
        archived: false,
      });
      setVersions([]);
      setFilePath("SKILL.md");
      setDirty(true);
      setFolderPermissionsPending(!json && bundle.files.some((file) => file.path !== "SKILL.md"));
      setHistoryOpen(false);
      setNotice(
        existing
          ? "Imported as a draft of this skill. Review the files, then publish a new version."
          : "Imported as a draft. Review the files, then publish to this profile.",
      );
    } catch (reason) {
      fail(reason);
    } finally {
      if (folderRef.current) folderRef.current.value = "";
      if (bundleRef.current) bundleRef.current.value = "";
    }
  }

  async function publish(archive = false) {
    if (!draft || busy || folderPermissionsPending) return;
    if (
      archive &&
      !window.confirm(
        `Archive ${draft.name}? Connected agents will stop using it. Device sync moves unchanged installed copies into a backup folder.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const bundle = archive
        ? null
        : validateSkillBundle({ files: draft.files });
      const name = bundle?.name ?? draft.name;
      if (draft.baseRevision && name !== draft.name)
        throw new Error(
          "Published skill names stay fixed. Create a new skill to use another name.",
        );
      const value = await request<{ skill: StoredSkill }>(
        `/api/app/skills/${encodeURIComponent(name)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strapId,
            ...bundle,
            baseRevision: draft.baseRevision,
            archived: archive,
          }),
        },
      );
      if (!mounted.current) return;
      setDraft({
        name,
        baseRevision: value.skill.revision,
        files: value.skill.files,
        archived: value.skill.archived,
      });
      setDirty(false);
      setNotice(
        archive
          ? "Skill archived. Devices will pick up this change on their next sync."
          : `Version ${value.skill.revision} published. Agents can read it now; devices get it on their next sync.`,
      );
      const history = await request<{ versions: SkillSummary[] }>(
        `/api/app/skills/${encodeURIComponent(name)}?${query}`,
      );
      if (mounted.current) setVersions(history.versions);
      await load();
    } catch (reason) {
      fail(reason);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function restoreVersion(revision: number) {
    if (!draft || !mayLeave()) return;
    setBusy(true);
    setError("");
    try {
      const { skill } = await request<{ skill: StoredSkill }>(
        `/api/app/skills/${encodeURIComponent(draft.name)}?${query}&revision=${revision}`,
      );
      if (!mounted.current) return;
      setDraft((current) =>
        current ? { ...current, files: skill.files, archived: false } : current,
      );
      setDirty(true);
      setFolderPermissionsPending(false);
      setFilePath("SKILL.md");
      setHistoryOpen(false);
      setNotice(
        `Version ${revision} loaded as a draft. Publish to restore it as a new version.`,
      );
    } catch (reason) {
      fail(reason);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  const currentFile = draft?.files.find((file) => file.path === filePath);
  const visible = items.filter(
    (item) =>
      (showArchived || !item.archived) &&
      `${item.name} ${item.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const editable = canManage && !busy;

  return (
    <div className="h-full overflow-y-auto bg-[var(--strap-surface-muted)] p-4 sm:p-6 lg:p-10">
      <div className="mx-auto max-w-6xl pb-10">
        <div className="mb-6">
          <StrapSwitcher beforeSwitch={() => !busy && mayLeave()} />
        </div>
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <span className="inline-block border border-[var(--strap-frame)] bg-[var(--strap-skills)] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-black">
              Skills
            </span>
            <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Shared know-how.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--strap-text-secondary)]">
              Keep your workflows in one place. Bring them to every device and
              every connected agent.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {canManage && (
              <>
                <Button
                  variant="outline"
                  onClick={() => folderRef.current?.click()}
                  disabled={busy}
                >
                  <FolderUp size={15} /> Import folder
                </Button>
                <Button onClick={newSkill} disabled={busy}>
                  <Plus size={15} /> New skill
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Refresh skill library"
              disabled={busy || loading}
              onClick={() => {
                setError("");
                void load().catch(fail);
              }}
            >
              <RefreshCw size={16} />
            </Button>
          </div>
        </header>
        <input
          ref={folderRef}
          type="file"
          multiple
          {...{ webkitdirectory: "" }}
          className="hidden"
          aria-label="Import skill folder"
          onChange={(event) => {
            void importFiles(event.target.files);
          }}
        />
        <input
          ref={bundleRef}
          type="file"
          accept=".json"
          className="hidden"
          aria-label="Import skill bundle"
          onChange={(event) => {
            void importFiles(event.target.files, true);
          }}
        />
        <DeviceSetup />
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] text-[var(--strap-text-secondary)]">
          <span>{company ? "Company library" : "Personal library"}</span>
          <span>{items.length} / 100 skills, including archived</span>
          <span>Up to 20 versions per skill</span>
          <span>{storageBytes === null ? "64 MiB per profile" : `${(storageBytes / 1048576).toFixed(1)} / 64 MiB, including history`}</span>
          {company && (
            <span>Members use skills. Owners and admins publish.</span>
          )}
        </div>
        {error && (
          <div
            role="alert"
            className="mt-4 rounded-sm border border-[var(--strap-danger)] bg-[var(--strap-danger-tint)] p-4 text-sm leading-6"
          >
            <p>{error}</p>
            {dirty && draft && (
              <p className="mt-1">
                Your draft is still here.{" "}
                <button
                  className="underline underline-offset-4"
                  onClick={() => download(draft.name, { files: draft.files })}
                >
                  Download the draft
                </button>{" "}
                before loading another version.
              </p>
            )}
          </div>
        )}
        {notice && (
          <p
            role="status"
            className="mt-4 border-l-2 border-[var(--strap-skills)] pl-3 text-sm leading-6"
          >
            {notice}
          </p>
        )}
        {loading ? (
          <p
            role="status"
            className="mt-10 py-10 text-sm text-[var(--strap-text-secondary)]"
          >
            Loading skills…
          </p>
        ) : (
          <div className="mt-4 grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className={FRAME} aria-label="Skill library">
              <div className="border-b border-[var(--strap-border)] p-3">
                <div className="relative">
                  <Search
                    className="absolute left-2.5 top-2.5 text-[var(--strap-text-secondary)]"
                    size={15}
                  />
                  <Input
                    aria-label="Search skills"
                    placeholder="Find a skill"
                    className="pl-8"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <label className="mt-3 flex items-center gap-2 text-xs text-[var(--strap-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(event) => setShowArchived(event.target.checked)}
                  />{" "}
                  Show archived
                </label>
              </div>
              <ul className="max-h-[28rem] overflow-auto p-2">
                {visible.map((item) => (
                  <li key={item.id}>
                    <button
                      disabled={busy}
                      onClick={() => {
                        void openSkill(item.name);
                      }}
                      className={cn(
                        "mb-1 w-full rounded-sm border border-transparent p-3 text-left hover:bg-[var(--strap-surface-raised)] focus-visible:outline-2 focus-visible:outline-[var(--strap-skills)] disabled:opacity-50",
                        draft?.name === item.name &&
                          "border-[var(--strap-skills)] bg-[var(--strap-skills-tint)]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="break-all font-mono text-xs font-semibold">
                          {item.name}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-[var(--strap-text-secondary)]">
                          v{item.revision}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--strap-text-secondary)]">
                        {item.description}
                      </p>
                      {item.archived && (
                        <span className="mt-2 inline-block font-mono text-[10px] uppercase">
                          Archived
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {!visible.length && (
                <p className="px-4 pb-6 pt-2 text-sm text-[var(--strap-text-secondary)]">
                  {search ? "No matching skills." : "No skills here yet."}
                </p>
              )}
              {canManage && (
                <div className="border-t border-[var(--strap-border)] p-3">
                  <button
                    disabled={busy}
                    onClick={() => bundleRef.current?.click()}
                    className="text-xs text-[var(--strap-text-secondary)] underline underline-offset-4"
                  >
                    Import a downloaded bundle
                  </button>
                </div>
              )}
            </aside>
            {!draft ? (
              <section
                className={cn(
                  FRAME,
                  "flex min-h-96 flex-col items-start justify-center p-6 sm:p-10",
                )}
              >
                <FileCode2 size={30} className="text-[var(--strap-skills)]" />
                <h2 className="mt-5 font-heading text-2xl font-semibold tracking-tight">
                  A workflow worth repeating.
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-[var(--strap-text-secondary)]">
                  A skill is a folder with a SKILL.md file. Add your
                  instructions, scripts, references, and assets. Strap keeps
                  them together and shares the latest version with your agents.
                </p>
                {canManage ? (
                  <Button className="mt-6" variant="outline" onClick={newSkill}>
                    <Plus size={15} /> Create your first skill
                  </Button>
                ) : (
                  <p className="mt-6 text-sm">
                    Choose a skill to read it, or ask a Company admin to add
                    one.
                  </p>
                )}
                <p className="mt-5 text-xs text-[var(--strap-text-secondary)]">
                  Up to 128 files and 2 MiB per skill. Keep credentials in
                  Vault.
                </p>
              </section>
            ) : (
              <section
                className={cn(FRAME, "min-w-0")}
                aria-label="Skill editor"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--strap-border)] p-4">
                  <div>
                    <h2 className="break-all font-mono text-sm font-semibold">
                      {draft.name}
                    </h2>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-[var(--strap-text-secondary)]">
                      {draft.baseRevision
                        ? `Version ${draft.baseRevision}`
                        : "Unpublished"}
                      {dirty ? " · Unsaved draft" : ""}
                      {draft.archived ? " · Archived" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Download skill bundle"
                      onClick={() =>
                        download(draft.name, { files: draft.files })
                      }
                    >
                      <ArrowDownToLine size={15} />
                    </Button>
                    {draft.baseRevision > 0 && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Version history"
                        aria-expanded={historyOpen}
                        onClick={() => setHistoryOpen(!historyOpen)}
                      >
                        <History size={15} />
                      </Button>
                    )}
                    {canManage && draft.baseRevision > 0 && !draft.archived && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Archive skill"
                        disabled={busy || dirty}
                        onClick={() => {
                          void publish(true);
                        }}
                      >
                        <Archive size={15} />
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        size="sm"
                        disabled={busy || folderPermissionsPending || (!dirty && !draft.archived)}
                        onClick={() => {
                          void publish();
                        }}
                      >
                        {busy
                          ? "Saving…"
                          : draft.archived
                            ? "Restore skill"
                            : "Publish version"}
                      </Button>
                    )}
                  </div>
                </div>
                {folderPermissionsPending && (
                  <div className="border-b border-[var(--strap-border)] bg-[var(--strap-surface-muted)] p-4 text-sm leading-6">
                    <p>Browsers cannot read executable permissions from folders. Select each script below and check its Executable file setting. Publishing with the CLI preserves these permissions automatically.</p>
                    <label className="mt-3 flex items-center gap-2">
                      <input type="checkbox" checked={false} onChange={() => setFolderPermissionsPending(false)} />
                      I checked the executable file settings.
                    </label>
                  </div>
                )}
                {historyOpen && (
                  <div className="border-b border-[var(--strap-border)] bg-[var(--strap-surface-muted)] p-4">
                    <p className="mb-3 text-xs text-[var(--strap-text-secondary)]">
                      Restore loads an earlier version as a draft. Publishing
                      keeps the current version in history. Older history is removed
                      first when the profile reaches its 64 MiB storage limit.
                    </p>
                    {versions.map((version) => (
                      <div
                        key={version.revision}
                        className="flex items-center justify-between gap-3 border-t border-[var(--strap-border)] py-2 text-xs"
                      >
                        <span>
                          Version {version.revision}
                          {version.archived ? " · Archived" : ""}
                          <span className="ml-2 text-[var(--strap-text-secondary)]">
                            {new Date(version.updatedAt).toLocaleDateString()}
                          </span>
                        </span>
                        {canManage && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => {
                              void restoreVersion(version.revision);
                            }}
                          >
                            Load draft
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 border-b border-[var(--strap-border)] px-4 py-3">
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Skill file</span>
                    <select
                      className="w-full min-w-0 truncate rounded-sm border border-[var(--strap-border)] bg-[var(--strap-surface)] p-2 font-mono text-xs"
                      value={filePath}
                      onChange={(event) => setFilePath(event.target.value)}
                    >
                      {draft.files.map((file) => (
                        <option key={file.path} value={file.path}>
                          {file.path}
                        </option>
                      ))}
                    </select>
                  </label>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!editable}
                      onClick={() => setAddingFile(!addingFile)}
                    >
                      <Plus size={14} /> File
                    </Button>
                  )}
                </div>
                {addingFile && (
                  <form
                    className="flex gap-2 border-b border-[var(--strap-border)] p-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      try {
                        const path = validateSkillPath(newPath);
                        validateSkillBundle({
                          files: [
                            ...draft.files,
                            {
                              path,
                              content: "",
                              encoding: "utf8",
                              executable: false,
                            },
                          ],
                        });
                        setDraft({
                          ...draft,
                          files: [
                            ...draft.files,
                            {
                              path,
                              content: "",
                              encoding: "utf8",
                              executable: false,
                            },
                          ],
                        });
                        setDirty(true);
                        setFilePath(path);
                        setNewPath("");
                        setAddingFile(false);
                      } catch (reason) {
                        fail(reason);
                      }
                    }}
                  >
                    <Input
                      aria-label="New file path"
                      placeholder="references/example.md"
                      value={newPath}
                      onChange={(event) => setNewPath(event.target.value)}
                    />
                    <Button type="submit" size="sm">
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Cancel new file"
                      onClick={() => setAddingFile(false)}
                    >
                      <X size={14} />
                    </Button>
                  </form>
                )}
                {currentFile?.encoding === "utf8" ? (
                  <Textarea
                    aria-label={`Edit ${currentFile.path}`}
                    spellCheck={false}
                    readOnly={!editable}
                    value={currentFile.content}
                    onChange={(event) => {
                      setDraft({
                        ...draft,
                        files: draft.files.map((file) =>
                          file.path === filePath
                            ? { ...file, content: event.target.value }
                            : file,
                        ),
                      });
                      setDirty(true);
                    }}
                    className="min-h-[420px] w-full resize-y rounded-none border-0 bg-transparent p-4 font-mono text-xs leading-6 shadow-none focus-visible:ring-inset"
                  />
                ) : (
                  <div className="p-6 text-sm text-[var(--strap-text-secondary)]">
                    Binary asset ·{" "}
                    {currentFile
                      ? Math.ceil(fileBytes(currentFile).length / 1024)
                      : 0}{" "}
                    KiB. Included in downloads and device sync.
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--strap-border)] p-3 text-xs text-[var(--strap-text-secondary)]">
                  <span>
                    {draft.files.length}{" "}
                    {draft.files.length === 1 ? "file" : "files"} ·{" "}
                    {Math.ceil(
                      draft.files.reduce(
                        (size, file) => size + fileBytes(file).length,
                        0,
                      ) / 1024,
                    )}{" "}
                    KiB
                  </span>
                  {canManage &&
                    currentFile &&
                    currentFile.path !== "SKILL.md" && (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={currentFile.executable}
                          disabled={!editable}
                          onChange={(event) => {
                            setDraft({
                              ...draft,
                              files: draft.files.map((file) =>
                                file.path === filePath
                                  ? {
                                      ...file,
                                      executable: event.target.checked,
                                    }
                                  : file,
                              ),
                            });
                            setDirty(true);
                          }}
                        />{" "}
                        Executable file
                      </label>
                    )}
                  {canManage &&
                    currentFile &&
                    currentFile.path !== "SKILL.md" && (
                      <button
                        disabled={!editable}
                        className="underline underline-offset-4"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Remove ${filePath} from this draft?`,
                            )
                          ) {
                            setDraft({
                              ...draft,
                              files: draft.files.filter(
                                (file) => file.path !== filePath,
                              ),
                            });
                            setFilePath("SKILL.md");
                            setDirty(true);
                          }
                        }}
                      >
                        Remove file from draft
                      </button>
                    )}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
