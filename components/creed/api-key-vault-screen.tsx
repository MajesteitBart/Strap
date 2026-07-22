"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Eye, EyeOff, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreed } from "@/components/creed/creed-provider";

type VaultItem = {
  id: string;
  creedId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string | null;
};

type EditorState = {
  id: string | null;
  name: string;
  description: string;
  secret: string;
};

const EMPTY_EDITOR: EditorState = { id: null, name: "", description: "", secret: "" };

export function ApiKeyVaultScreen() {
  const { state } = useCreed();
  const creedId = state.creedId;
  const companyMember = state.creedType === "company" && state.company?.myRole === "member";
  const [items, setItems] = useState<VaultItem[]>([]);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [editorOpen, setEditorOpen] = useState(false);
  const [revealed, setRevealed] = useState<{ itemId: string; secret: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!creedId || companyMember) return;
    const response = await fetch(`/api/app/vault?creedId=${encodeURIComponent(creedId)}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as { items?: VaultItem[]; error?: string };
    if (!response.ok) throw new Error(payload.error || "Could not load the Vault.");
    setItems(payload.items ?? []);
  }, [companyMember, creedId]);

  useEffect(() => {
    setRevealed(null);
    setEditorOpen(false);
    setError(null);
    void loadItems().catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Could not load the Vault."));
  }, [loadItems]);

  useEffect(() => {
    if (!revealed) return;
    const timeout = window.setTimeout(() => setRevealed(null), 30_000);
    return () => window.clearTimeout(timeout);
  }, [revealed]);

  function openCreate() {
    setEditor(EMPTY_EDITOR);
    setEditorOpen(true);
    setError(null);
  }

  function openEdit(item: VaultItem) {
    setEditor({ id: item.id, name: item.name, description: item.description, secret: "" });
    setEditorOpen(true);
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
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
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
    const response = await fetch(`/api/app/vault/${encodeURIComponent(item.id)}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error || "Could not delete the Vault item.");
      return;
    }
    if (revealed?.itemId === item.id) setRevealed(null);
    await loadItems();
  }

  if (companyMember) {
    return (
      <div className="h-full overflow-y-auto bg-[var(--creed-surface)] p-8 md:p-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-heading text-[1.75rem] font-medium tracking-[-0.03em]">API key Vault</h1>
          <div className="mt-8 rounded-xl border border-[var(--creed-border)] p-6">
            <h2 className="text-[15px] font-medium">Manager access required</h2>
            <p className="mt-2 text-[14px] leading-7 text-[var(--creed-text-secondary)]">Company Vault secrets are available only to owners and admins.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--creed-surface)] creed-scrollbar">
      <div className="mx-auto max-w-[960px] px-4 py-8 md:px-12 md:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-[1.75rem] font-medium tracking-[-0.03em] text-[var(--creed-text-primary)]">API key Vault</h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-7 text-[var(--creed-text-secondary)]">Store external API keys in Supabase Vault. Secret values stay hidden until you explicitly reveal them.</p>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add secret</Button>
        </div>

        {editorOpen ? (
          <section className="mt-6 rounded-xl border border-[var(--creed-border)] bg-[var(--creed-surface-raised)]/30 p-5">
            <h2 className="text-[15px] font-medium">{editor.id ? "Edit secret" : "Add a secret"}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-[13px] font-medium">Name<Input className="mt-2" value={editor.name} maxLength={120} onChange={(event) => setEditor((current) => ({ ...current, name: event.target.value }))} placeholder="OpenRouter production" /></label>
              <label className="text-[13px] font-medium">Description<Input className="mt-2" value={editor.description} maxLength={500} onChange={(event) => setEditor((current) => ({ ...current, description: event.target.value }))} placeholder="Used by the research agent" /></label>
            </div>
            <label className="mt-4 block text-[13px] font-medium">{editor.id ? "Replacement secret (optional)" : "Secret value"}<Textarea className="mt-2 min-h-24 font-mono" value={editor.secret} maxLength={16_384} onChange={(event) => setEditor((current) => ({ ...current, secret: event.target.value }))} autoComplete="off" spellCheck={false} placeholder={editor.id ? "Leave blank to keep the current value" : "Paste the API key"} /></label>
            <div className="mt-4 flex gap-3"><Button onClick={() => void saveItem()} disabled={busy || !editor.name.trim() || (!editor.id && !editor.secret)}>{busy ? "Saving…" : "Save"}</Button><Button variant="ghost" onClick={() => { setEditor(EMPTY_EDITOR); setEditorOpen(false); }}>Cancel</Button></div>
          </section>
        ) : null}

        {error ? <p className="mt-5 text-[13px] text-[var(--creed-danger)]">{error}</p> : null}

        <section className="mt-8">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--creed-border)] px-6 py-12 text-center">
              <KeyRound className="mx-auto h-6 w-6 text-[var(--creed-text-tertiary)]" />
              <h2 className="mt-4 text-[15px] font-medium">No stored API keys</h2>
              <p className="mt-2 text-[13px] text-[var(--creed-text-secondary)]">Add a secret to keep it encrypted and available for deliberate reveal.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--creed-border)] rounded-xl border border-[var(--creed-border)]">
              {items.map((item) => {
                const visible = revealed?.itemId === item.id;
                return (
                  <article key={item.id} className="p-4 md:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-[14px] font-medium">{item.name}</h2>
                        {item.description ? <p className="mt-1 text-[13px] leading-6 text-[var(--creed-text-secondary)]">{item.description}</p> : null}
                        <p className="mt-2 text-[12px] text-[var(--creed-text-tertiary)]">Updated {new Date(item.updatedAt).toLocaleDateString()}{item.lastAccessedAt ? ` · Revealed ${new Date(item.lastAccessedAt).toLocaleDateString()}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" aria-label={visible ? `Hide ${item.name}` : `Reveal ${item.name}`} onClick={() => void revealItem(item.id)}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                        <Button size="icon" variant="ghost" aria-label={`Edit ${item.name}`} onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label={`Delete ${item.name}`} onClick={() => void deleteItem(item)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    {visible ? (
                      <div className="mt-4 flex items-start gap-2 rounded-lg bg-[var(--creed-surface-raised)] p-3">
                        <code className="min-w-0 flex-1 break-all text-[12px]">{revealed.secret}</code>
                        <Button size="icon" variant="ghost" aria-label={`Copy ${item.name}`} onClick={() => void navigator.clipboard.writeText(revealed.secret)}><Copy className="h-4 w-4" /></Button>
                        <span className="sr-only" aria-live="polite">Secret will hide after 30 seconds.</span>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
