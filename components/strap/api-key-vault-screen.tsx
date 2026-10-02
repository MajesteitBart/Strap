"use client";

import { useStrap } from "@/components/strap/strap-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Eye, EyeOff, Folder, FolderPlus, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type VaultItem = {
  id: string;
  creedId: string;
  folderId: string | null;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string | null;
};

type VaultFolder = {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
};

type EditorState = {
  id: string | null;
  name: string;
  description: string;
  secret: string;
  folderId: string;
  // The folder when the editor opened; a move is rejected if another session moved the secret since.
  originalFolderId: string;
};

type FolderEditorState = {
  id: string | null;
  name: string;
  description: string;
  // The folder's version when the editor opened; a save is rejected if another session changed it since.
  updatedAt: string;
};

const EMPTY_EDITOR: EditorState = { id: null, name: "", description: "", secret: "", folderId: "", originalFolderId: "" };
const EMPTY_FOLDER_EDITOR: FolderEditorState = { id: null, name: "", description: "", updatedAt: "" };

// Keyed by Strap so items, the editor and any in-flight request from the
// previously active Strap never render, or act, under the new Strap's heading.
export function ApiKeyVaultScreen() {
  const { state } = useStrap();
  return <StrapVault key={state.creedId ?? "none"} />;
}

function StrapVault() {
  const { state } = useStrap();
  const creedId = state.creedId;
  const companyMember = state.creedType === "company" && state.company?.myRole === "member";
  // Vault items belong to the active Strap, so the header names it: a personal
  // Vault is readable by its owner only, a company Vault by every owner and admin.
  const companyName = state.creedType === "company" ? (state.company?.creedName ?? "Company") : null;
  const vaultTitle = companyName ? `${companyName} Vault` : "Personal Vault";
  const vaultScope = companyName
    ? `API keys stored in ${companyName}. Every owner and admin of ${companyName} can reveal them.`
    : "API keys stored in your personal Strap. Values stay hidden until you reveal them.";
  const [items, setItems] = useState<VaultItem[]>([]);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [editorOpen, setEditorOpen] = useState(false);
  const [folderEditor, setFolderEditor] = useState<FolderEditorState>(EMPTY_FOLDER_EDITOR);
  const [folderEditorOpen, setFolderEditorOpen] = useState(false);
  const [revealed, setRevealed] = useState<{ itemId: string; secret: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!creedId || companyMember) return;
    const response = await fetch(`/api/app/vault?creedId=${encodeURIComponent(creedId)}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as { items?: VaultItem[]; folders?: VaultFolder[]; error?: string };
    if (!response.ok) throw new Error(payload.error || "Could not load the Vault.");
    setItems(payload.items ?? []);
    setFolders(payload.folders ?? []);
  }, [companyMember, creedId]);

  useEffect(() => {
    setRevealed(null);
    setEditorOpen(false);
    setFolderEditorOpen(false);
    setError(null);
    void loadItems().catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Could not load the Vault."));
  }, [loadItems]);

  useEffect(() => {
    if (!revealed) return;
    const timeout = window.setTimeout(() => setRevealed(null), 30_000);
    return () => window.clearTimeout(timeout);
  }, [revealed]);

  function openCreate(folderId = "") {
    setEditor({ ...EMPTY_EDITOR, folderId });
    setEditorOpen(true);
    setFolderEditorOpen(false);
    setError(null);
  }

  function openEdit(item: VaultItem) {
    setEditor({ id: item.id, name: item.name, description: item.description, secret: "", folderId: item.folderId ?? "", originalFolderId: item.folderId ?? "" });
    setEditorOpen(true);
    setFolderEditorOpen(false);
    setError(null);
  }

  function openFolderEditor(folder?: VaultFolder) {
    setFolderEditor(folder ? { id: folder.id, name: folder.name, description: folder.description, updatedAt: folder.updatedAt } : EMPTY_FOLDER_EDITOR);
    setFolderEditorOpen(true);
    setEditorOpen(false);
    setError(null);
  }

  async function saveItem() {
    if (!creedId || !editor.name.trim() || (!editor.id && !editor.secret)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(editor.id ? `/api/app/vault/${encodeURIComponent(editor.id)}` : "/api/app/vault", {
        method: editor.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creedId,
          name: editor.name.trim(),
          description: editor.description.trim(),
          secret: editor.id && !editor.secret ? null : editor.secret,
          // Edits send the folder only when the user changed it, with the folder they started from.
          ...(!editor.id
            ? { folderId: editor.folderId || null }
            : editor.folderId !== editor.originalFolderId
              ? { folderId: editor.folderId || null, expectedFolderId: editor.originalFolderId || null }
              : {}),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (response.status === 409) await loadItems().catch(() => undefined);
      if (!response.ok) throw new Error(payload.error || "Could not save the Vault item.");
      setEditor(EMPTY_EDITOR);
      setEditorOpen(false);
      setRevealed(null);
      await loadItems();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the Vault item.");
    } finally {
      setBusy(false);
    }
  }

  async function saveFolder() {
    if (!creedId || !folderEditor.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(folderEditor.id ? `/api/app/vault/folders/${encodeURIComponent(folderEditor.id)}` : "/api/app/vault/folders", {
        method: folderEditor.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creedId,
          name: folderEditor.name.trim(),
          description: folderEditor.description.trim(),
          ...(folderEditor.id ? { expectedUpdatedAt: folderEditor.updatedAt } : {}),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (response.status === 409) await loadItems().catch(() => undefined);
      if (!response.ok) throw new Error(payload.error || "Could not save the folder.");
      setFolderEditor(EMPTY_FOLDER_EDITOR);
      setFolderEditorOpen(false);
      await loadItems();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the folder.");
    } finally {
      setBusy(false);
    }
  }

  async function revealItem(itemId: string) {
    if (revealed?.itemId === itemId) {
      setRevealed(null);
      return;
    }
    setError(null);
    const response = await fetch(`/api/app/vault/${encodeURIComponent(itemId)}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as { secret?: string; error?: string };
    if (!response.ok || typeof payload.secret !== "string") {
      setError(payload.error || "Could not reveal the secret.");
      return;
    }
    setRevealed({ itemId, secret: payload.secret });
  }

  async function deleteItem(item: VaultItem) {
    if (!window.confirm(`Delete ${item.name}? This removes the encrypted secret permanently.`)) return;
    setError(null);
    const response = await fetch(`/api/app/vault/${encodeURIComponent(item.id)}`, { method: "DELETE" }).catch(() => null);
    if (!response) return reloadAfterUncertainDelete(`The delete request for ${item.name} did not complete.`);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error || "Could not delete the Vault item.");
      return;
    }
    if (revealed?.itemId === item.id) setRevealed(null);
    await loadItems().catch(() => setError("Deleted. Reload to see the current Vault."));
  }

  // The server may have committed the delete before the connection failed, so
  // show the current Vault instead of inviting a blind retry.
  async function reloadAfterUncertainDelete(message: string) {
    setRevealed(null);
    try {
      await loadItems();
      setError(`${message} The Vault below is current; check it before trying again.`);
    } catch {
      setError(`${message} Reload the page to see whether it was deleted.`);
    }
  }

  async function deleteFolder(folder: VaultFolder, count: number) {
    const contents = count ? ` Its ${count} secret${count === 1 ? "" : "s"} stay in the Vault without a folder, and API keys that reach them through this folder lose access.` : "";
    if (!window.confirm(`Delete the folder ${folder.name}?${contents}`)) return;
    setError(null);
    const response = await fetch(`/api/app/vault/folders/${encodeURIComponent(folder.id)}`, { method: "DELETE" }).catch(() => null);
    if (!response) return reloadAfterUncertainDelete(`The delete request for the folder ${folder.name} did not complete.`);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error || "Could not delete the folder.");
      return;
    }
    await loadItems().catch(() => setError("Deleted. Reload to see the current Vault."));
  }

  if (companyMember) {
    return (
      <div className="h-full overflow-y-auto bg-[var(--strap-surface)] p-8 md:p-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-heading text-[1.75rem] font-semibold tracking-[-0.03em]">{vaultTitle}</h1>
          <div className="mt-8 rounded-xl border border-[var(--strap-border)] p-6">
            <h2 className="text-[15px] font-medium">Manager access required</h2>
            <p className="mt-2 text-[14px] leading-7 text-[var(--strap-text-secondary)]">Company Vault secrets are available only to owners and admins.</p>
          </div>
        </div>
      </div>
    );
  }

  const folderIds = new Set(folders.map((folder) => folder.id));
  const unfiled = items.filter((item) => !item.folderId || !folderIds.has(item.folderId));

  function renderItem(item: VaultItem) {
    const visible = revealed?.itemId === item.id;
    return (
      <article key={item.id} className="p-4 md:p-5">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="break-all text-[14px] font-medium">{item.name}</h3>
            {item.description ? <p className="mt-1 text-[13px] leading-6 text-[var(--strap-text-secondary)]">{item.description}</p> : null}
            <p className="mt-2 text-[12px] text-[var(--strap-text-tertiary)]">Updated {new Date(item.updatedAt).toLocaleDateString()}{item.lastAccessedAt ? ` · Revealed ${new Date(item.lastAccessedAt).toLocaleDateString()}` : ""}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button size="icon" variant="ghost" aria-label={`Copy reference for ${item.name}`} title="Copy secret reference for Varlock" onClick={() => void navigator.clipboard.writeText(`secret://${item.id}`)}><Copy className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" aria-label={visible ? `Hide ${item.name}` : `Reveal ${item.name}`} onClick={() => void revealItem(item.id)}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
            <Button size="icon" variant="ghost" aria-label={`Edit ${item.name}`} onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" aria-label={`Delete ${item.name}`} onClick={() => void deleteItem(item)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
        {visible ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-[var(--strap-surface-raised)] p-3">
            <code className="min-w-0 flex-1 break-all text-[12px]">{revealed.secret}</code>
            <Button size="icon" variant="ghost" aria-label={`Copy ${item.name}`} onClick={() => void navigator.clipboard.writeText(revealed.secret)}><Copy className="h-4 w-4" /></Button>
            <span className="sr-only" aria-live="polite">Secret will hide after 30 seconds.</span>
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--strap-surface)] strap-scrollbar">
      <div className="mx-auto max-w-[960px] px-4 py-8 md:px-12 md:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-[1.75rem] font-semibold tracking-[-0.03em] text-[var(--strap-text-primary)]">{vaultTitle}</h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-7 text-[var(--strap-text-secondary)]">{vaultScope}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => openFolderEditor()}><FolderPlus className="h-4 w-4" /> New folder</Button>
            <Button onClick={() => openCreate()}><Plus className="h-4 w-4" /> Add secret</Button>
          </div>
        </div>

        {folderEditorOpen ? (
          <section className="mt-6 rounded-xl border border-[var(--strap-border)] bg-[var(--strap-surface-raised)]/30 p-5">
            <h2 className="text-[15px] font-medium">{folderEditor.id ? "Edit folder" : "New folder"}</h2>
            <p className="mt-1 text-[13px] leading-6 text-[var(--strap-text-secondary)]">API keys with access to a folder can reveal every secret in it, including secrets you add later.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-[13px] font-medium">Name<Input className="mt-2" value={folderEditor.name} maxLength={120} onChange={(event) => setFolderEditor((current) => ({ ...current, name: event.target.value }))} placeholder="share-artifact" /></label>
              <label className="text-[13px] font-medium">Description<Input className="mt-2" value={folderEditor.description} maxLength={500} onChange={(event) => setFolderEditor((current) => ({ ...current, description: event.target.value }))} placeholder="Secrets for the artifact server" /></label>
            </div>
            <div className="mt-4 flex gap-3"><Button onClick={() => void saveFolder()} disabled={busy || !folderEditor.name.trim()}>{busy ? "Saving…" : "Save"}</Button><Button variant="ghost" onClick={() => { setFolderEditor(EMPTY_FOLDER_EDITOR); setFolderEditorOpen(false); }}>Cancel</Button></div>
          </section>
        ) : null}

        {editorOpen ? (
          <section className="mt-6 rounded-xl border border-[var(--strap-border)] bg-[var(--strap-surface-raised)]/30 p-5">
            <h2 className="text-[15px] font-medium">{editor.id ? "Edit secret" : "Add a secret"}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-[13px] font-medium">Name<Input className="mt-2" value={editor.name} maxLength={120} onChange={(event) => setEditor((current) => ({ ...current, name: event.target.value }))} placeholder="Deployment API" /></label>
              <label className="text-[13px] font-medium">Description<Input className="mt-2" value={editor.description} maxLength={500} onChange={(event) => setEditor((current) => ({ ...current, description: event.target.value }))} placeholder="Used by the research agent" /></label>
            </div>
            {folders.length ? (
              <label className="mt-4 block text-[13px] font-medium">Folder
                <select value={editor.folderId} onChange={(event) => setEditor((current) => ({ ...current, folderId: event.target.value }))} className="mt-2 block h-8 w-full rounded-[var(--radius-md)] border border-input bg-transparent px-3 text-sm font-normal sm:w-1/2">
                  <option value="">No folder</option>
                  {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                </select>
              </label>
            ) : null}
            <label className="mt-4 block text-[13px] font-medium">{editor.id ? "Replacement secret (optional)" : "Secret value"}<Textarea className="mt-2 min-h-24 font-mono" value={editor.secret} maxLength={16_384} onChange={(event) => setEditor((current) => ({ ...current, secret: event.target.value }))} autoComplete="off" spellCheck={false} placeholder={editor.id ? "Leave blank to keep the current value" : "Paste the API key"} /></label>
            <div className="mt-4 flex gap-3"><Button onClick={() => void saveItem()} disabled={busy || !editor.name.trim() || (!editor.id && !editor.secret)}>{busy ? "Saving…" : "Save"}</Button><Button variant="ghost" onClick={() => { setEditor(EMPTY_EDITOR); setEditorOpen(false); }}>Cancel</Button></div>
          </section>
        ) : null}

        {error ? <p className="mt-5 text-[13px] text-[var(--strap-danger)]">{error}</p> : null}

        <section className="mt-8 space-y-6">
          {items.length === 0 && folders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--strap-border)] px-6 py-12 text-center">
              <KeyRound className="mx-auto h-6 w-6 text-[var(--strap-text-tertiary)]" />
              <h2 className="mt-4 text-[15px] font-medium">No stored API keys</h2>
              <p className="mt-2 text-[13px] text-[var(--strap-text-secondary)]">Add a secret to keep it encrypted and available for deliberate reveal.</p>
            </div>
          ) : null}

          {folders.map((folder) => {
            const contents = items.filter((item) => item.folderId === folder.id);
            return (
              <div key={folder.id}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-[14px] font-medium"><Folder className="h-4 w-4 shrink-0 text-[var(--strap-text-tertiary)]" /><span className="break-all">{folder.name}</span><span className="text-[12px] font-normal text-[var(--strap-text-tertiary)]">{contents.length}</span></h2>
                    {folder.description ? <p className="mt-1 text-[13px] text-[var(--strap-text-secondary)]">{folder.description}</p> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="icon" variant="ghost" aria-label={`Add a secret to ${folder.name}`} onClick={() => openCreate(folder.id)}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label={`Edit folder ${folder.name}`} onClick={() => openFolderEditor(folder)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label={`Delete folder ${folder.name}`} onClick={() => void deleteFolder(folder, contents.length)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                {contents.length ? (
                  <div className="divide-y divide-[var(--strap-border)] rounded-xl border border-[var(--strap-border)]">{contents.map(renderItem)}</div>
                ) : (
                  <p className="rounded-xl border border-dashed border-[var(--strap-border)] px-4 py-4 text-[13px] text-[var(--strap-text-secondary)]">No secrets in this folder yet.</p>
                )}
              </div>
            );
          })}

          {unfiled.length ? (
            <div>
              {folders.length ? <h2 className="mb-2 text-[14px] font-medium text-[var(--strap-text-secondary)]">Not in a folder</h2> : null}
              <div className="divide-y divide-[var(--strap-border)] rounded-xl border border-[var(--strap-border)]">{unfiled.map(renderItem)}</div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
