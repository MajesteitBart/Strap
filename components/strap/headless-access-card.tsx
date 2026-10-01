"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, KeyRound, Link2, RefreshCw, Server, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStrap } from "@/components/strap/strap-provider";
import type { HeadlessKeyMode } from "@/lib/headless-access-shared";

type KeyMetadata = {
  id: string;
  name: string;
  prefix: string;
  mode: HeadlessKeyMode;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  vaultItemIds: string[];
  vaultFolderIds: string[];
};

type VaultOption = { id: string; name: string; folderId: string | null };
type FolderOption = { id: string; name: string };
type Grants = { vaultItemIds: string[]; vaultFolderIds: string[] };

const NO_GRANTS: Grants = { vaultItemIds: [], vaultFolderIds: [] };
const MAX_GRANTS = 100;

const MODE_LABEL: Record<HeadlessKeyMode, string> = {
  "read-only": "Read only",
  "proposal-only": "Read and propose",
  direct: "Permitted direct edits",
};

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function grantSummary(key: KeyMetadata) {
  const parts = [
    key.vaultFolderIds?.length ? plural(key.vaultFolderIds.length, "folder") : "",
    key.vaultItemIds?.length ? plural(key.vaultItemIds.length, "secret") : "",
  ].filter(Boolean);
  return parts.length ? `Secret access: ${parts.join(", ")}` : "No secret access";
}

function toggle(ids: string[], id: string, checked: boolean) {
  return checked ? [...ids, id] : ids.filter((entry) => entry !== id);
}

function VaultGrantPicker({ folders, items, value, onChange, disabled }: {
  folders: FolderOption[];
  items: VaultOption[];
  value: Grants;
  onChange: (value: Grants) => void;
  disabled: boolean;
}) {
  const folderName = new Map(folders.map((folder) => [folder.id, folder.name]));
  if (!folders.length && !items.length) {
    return <p className="text-xs text-[var(--strap-text-secondary)]">Your Vault is empty. <Link href="/vault" className="underline underline-offset-4">Add secrets</Link> first.</p>;
  }
  return (
    <div className="flex max-h-56 flex-col gap-3 overflow-y-auto">
      {folders.length ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[var(--strap-text-secondary)]">Folders, including secrets added later</span>
          {folders.map((folder) => (
            <label key={folder.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={value.vaultFolderIds.includes(folder.id)} disabled={disabled || (!value.vaultFolderIds.includes(folder.id) && value.vaultFolderIds.length >= MAX_GRANTS)}
                onChange={(event) => onChange({ ...value, vaultFolderIds: toggle(value.vaultFolderIds, folder.id, event.target.checked) })} />
              {folder.name}
              <span className="text-xs text-[var(--strap-text-tertiary)]">{plural(items.filter((item) => item.folderId === folder.id).length, "secret")}</span>
            </label>
          ))}
        </div>
      ) : null}
      {items.length ? (
        <div className="flex flex-col gap-2">
          {folders.length ? <span className="text-xs font-medium text-[var(--strap-text-secondary)]">Individual secrets</span> : null}
          {items.map((item) => {
            // The checkbox is the direct grant only, so it stays removable when a
            // folder grant also covers the secret.
            const direct = value.vaultItemIds.includes(item.id);
            const viaFolder = item.folderId !== null && value.vaultFolderIds.includes(item.folderId);
            const folder = item.folderId ? folderName.get(item.folderId) : undefined;
            return (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={direct} disabled={disabled || (!direct && value.vaultItemIds.length >= MAX_GRANTS)}
                  onChange={(event) => onChange({ ...value, vaultItemIds: toggle(value.vaultItemIds, item.id, event.target.checked) })} />
                {item.name}
                {folder ? <span className="text-xs text-[var(--strap-text-tertiary)]">{viaFolder ? `also covered by ${folder}` : folder}</span> : null}
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function HeadlessAccessCard() {
  const { state } = useStrap();
  return <HeadlessAccessForm
    key={state.creedId}
    creedId={state.creedId}
    canUseVault={state.creedType !== "company" || state.company?.myRole === "owner" || state.company?.myRole === "admin"}
  />;
}

function HeadlessAccessForm({ creedId, canUseVault }: { creedId: string | undefined; canUseVault: boolean }) {
  const [keys, setKeys] = useState<KeyMetadata[]>([]);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<HeadlessKeyMode>("proposal-only");
  const [expiry, setExpiry] = useState("90");
  const [createdKey, setCreatedKey] = useState<{ key: string; rotated: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vaultItems, setVaultItems] = useState<VaultOption[]>([]);
  const [vaultFolders, setVaultFolders] = useState<FolderOption[]>([]);
  const [grants, setGrants] = useState<Grants>(NO_GRANTS);
  // `base` is the key's stored grants when the editor opened; the server rejects
  // the save if another session changed them since.
  const [editing, setEditing] = useState<{ keyId: string; base: Grants; grants: Grants } | null>(null);
  const [vaultError, setVaultError] = useState<string | null>(null);
  // Grants are edited against loaded Vault metadata only, so a failed or pending
  // load can never be saved as "no access".
  const [vaultLoaded, setVaultLoaded] = useState(false);
  const rotating = useRef(false);

  useEffect(() => {
    if (!creedId || !canUseVault) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/app/vault?strapId=${encodeURIComponent(creedId)}`, {
          cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        const payload = await response.json() as { items: VaultOption[]; folders?: FolderOption[] };
        if (!controller.signal.aborted) {
          setVaultItems(payload.items);
          setVaultFolders(payload.folders ?? []);
          setVaultLoaded(true);
        }
      } catch {
        if (!controller.signal.aborted) setVaultError("Could not load Vault items. Reload to select secrets.");
      }
    })();
    return () => controller.abort();
  }, [creedId, canUseVault]);

  const loadKeys = useCallback(async () => {
    if (!creedId) return;
    const response = await fetch(`/api/app/headless-access?creedId=${encodeURIComponent(creedId)}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as { keys?: KeyMetadata[]; error?: string };
    if (!response.ok) throw new Error(payload.error || "Could not load API keys.");
    setKeys(payload.keys ?? []);
  }, [creedId]);

  useEffect(() => {
    setCreatedKey(null);
    setError(null);
    void loadKeys().catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Could not load API keys."));
  }, [loadKeys]);

  async function createKey() {
    if (!creedId || !name.trim()) return;
    setBusy(true);
    setError(null);
    const expiresAt = expiry === "never"
      ? null
      : new Date(Date.now() + Number(expiry) * 86_400_000).toISOString();
    try {
      const response = await fetch("/api/app/headless-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creedId, name: name.trim(), mode, expiresAt, ...(canUseVault ? grants : NO_GRANTS) }),
      });
      const payload = (await response.json().catch(() => ({}))) as { key?: string; error?: string };
      if (!response.ok || !payload.key) throw new Error(payload.error || "Could not create API key.");
      setCreatedKey({ key: payload.key, rotated: false });
      setName("");
      setGrants(NO_GRANTS);
      await loadKeys();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create API key.");
    } finally {
      setBusy(false);
    }
  }

  async function saveGrants() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/app/headless-access/${encodeURIComponent(editing.keyId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editing.grants, expected: editing.base }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (response.status === 409) {
        // Show the current access instead of overwriting another session's change.
        setEditing(null);
        await loadKeys().catch(() => undefined);
      }
      if (!response.ok) throw new Error(payload.error || "Could not update secret access.");
      setEditing(null);
      await loadKeys();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update secret access.");
    } finally {
      setBusy(false);
    }
  }

  async function rotateKey(key: KeyMetadata) {
    // One rotation at a time: an older response arriving last would show a key
    // value that the newer rotation already invalidated.
    if (rotating.current) return;
    if (!window.confirm(`Rotate ${key.name}? The current value stops working immediately. Its mode, expiry and secret access stay the same.`)) return;
    rotating.current = true;
    // Any value still on screen may stop working once this rotation commits.
    setCreatedKey(null);
    setBusy(true);
    setError(null);
    // The server may have committed the rotation before the connection failed.
    const lost = `The rotation response for ${key.name} did not arrive, so its value may already have changed. Rotate again to get a key you can use.`;
    try {
      const response = await fetch(`/api/app/headless-access/${encodeURIComponent(key.id)}/rotate`, { method: "POST" }).catch(() => null);
      if (!response) return setError(lost);
      const payload = (await response.json().catch(() => ({}))) as { key?: string; error?: string };
      if (!response.ok) return setError(payload.error || "Could not rotate API key.");
      if (!payload.key) return setError(lost);
      setCreatedKey({ key: payload.key, rotated: true });
      await loadKeys().catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Could not reload API keys."));
    } finally {
      rotating.current = false;
      setBusy(false);
    }
  }

  function editGrants(key: KeyMetadata) {
    if (editing?.keyId === key.id) return setEditing(null);
    // Grants can outlive deleted folders and secrets. Drop those IDs here so the
    // editor saves only what it shows; the server still rejects unknown IDs.
    const folderIds = new Set(vaultFolders.map((folder) => folder.id));
    const itemIds = new Set(vaultItems.map((item) => item.id));
    setEditing({
      keyId: key.id,
      base: { vaultItemIds: key.vaultItemIds ?? [], vaultFolderIds: key.vaultFolderIds ?? [] },
      grants: {
        vaultItemIds: (key.vaultItemIds ?? []).filter((id) => itemIds.has(id)),
        vaultFolderIds: (key.vaultFolderIds ?? []).filter((id) => folderIds.has(id)),
      },
    });
  }

  async function revokeKey(id: string) {
    if (!window.confirm("Revoke this API key? Headless clients using it will disconnect immediately.")) return;
    setError(null);
    const response = await fetch(`/api/app/headless-access/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error || "Could not revoke API key.");
      return;
    }
    if (editing?.keyId === id) setEditing(null);
    await loadKeys();
  }

  return (
    <section className="mt-10">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--strap-surface-raised)] text-[var(--strap-text-secondary)]"><Server className="h-4 w-4" /></span>
        <div>
          <h2 className="text-[16px] font-medium text-[var(--strap-text-primary)]">Headless access</h2>
          <p className="mt-1 text-[14px] leading-6 text-[var(--strap-text-secondary)]">
            Connect remote agents with a scoped API key, or approve a device code on this browser.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--strap-border)] p-5">
          <div className="flex items-center gap-2 text-[15px] font-medium"><KeyRound className="h-4 w-4" /> Strap API key</div>
          <p className="mt-2 text-[13px] leading-6 text-[var(--strap-text-secondary)]">Use as the bearer token for the MCP URL above. The complete key is shown once.</p>
          <div className="mt-4 space-y-3">
            <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Hermes production server" />
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={mode} onChange={(event) => setMode(event.target.value as HeadlessKeyMode)} className="h-8 rounded-[var(--radius-md)] border border-input bg-transparent px-3 text-sm">
                <option value="read-only">Read only</option>
                <option value="proposal-only">Read and propose</option>
                <option value="direct">Permitted direct edits</option>
              </select>
              <select value={expiry} onChange={(event) => setExpiry(event.target.value)} className="h-8 rounded-[var(--radius-md)] border border-input bg-transparent px-3 text-sm">
                <option value="30">Expires in 30 days</option>
                <option value="90">Expires in 90 days</option>
                <option value="365">Expires in one year</option>
                <option value="never">No expiry</option>
              </select>
            </div>
            <p className="text-xs leading-5 text-[var(--strap-text-secondary)]">All modes can read shared skills. Direct access also permits skill publication for profile owners and Company admins.</p>
            {canUseVault ? (
              <fieldset disabled={busy} className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">Secret access for Varlock (optional)</legend>
                <p className="text-xs leading-5 text-[var(--strap-text-secondary)]">This key can reveal the folders and secrets you select, in any context access mode. You can change this later.</p>
                {vaultError ? <p role="alert" className="text-xs text-[var(--strap-danger)]">{vaultError}</p> : null}
                <VaultGrantPicker folders={vaultFolders} items={vaultItems} value={grants} onChange={setGrants} disabled={busy} />
                <Link href="/vault" className="text-xs underline underline-offset-4">Manage secrets and folders</Link>
              </fieldset>
            ) : null}
            <Button onClick={() => void createKey()} disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create API key"}</Button>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--strap-border)] p-5">
          <div className="flex items-center gap-2 text-[15px] font-medium"><Link2 className="h-4 w-4" /> Device authorization</div>
          <p className="mt-2 text-[13px] leading-6 text-[var(--strap-text-secondary)]">
            Agents that support OAuth device authorization show a short code. Enter it here, verify the client name, and choose one Strap.
          </p>
          <Button asChild variant="secondary" className="mt-4"><Link href="/device">Enter a device code</Link></Button>
          <p className="mt-3 text-[12px] leading-5 text-[var(--strap-text-tertiary)]">Never approve a code you did not start on your own agent.</p>
        </div>
      </div>

      {createdKey ? (
        <div className="mt-4 rounded-xl border border-[var(--strap-accent)]/40 bg-[var(--strap-accent)]/5 p-4">
          <div className="text-[14px] font-medium">{createdKey.rotated ? "Copy the rotated key now" : "Copy this key now"}</div>
          <p className="mt-1 text-[13px] text-[var(--strap-text-secondary)]">{createdKey.rotated ? "Replace the old value wherever it is stored. " : ""}It cannot be revealed again after you leave this page.</p>
          <div className="mt-3 flex items-start gap-2">
            <code className="min-w-0 flex-1 break-all rounded-md bg-[var(--strap-surface)] px-3 py-2 text-[12px]">{createdKey.key}</code>
            <Button size="icon" variant="secondary" aria-label="Copy API key" onClick={() => void navigator.clipboard.writeText(createdKey.key)}><Copy className="h-4 w-4" /></Button>
          </div>
          <Button variant="ghost" className="mt-2" onClick={() => setCreatedKey(null)}>I saved it</Button>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-[13px] text-[var(--strap-danger)]">{error}</p> : null}

      {keys.length ? (
        <div className="mt-5 divide-y divide-[var(--strap-border)] rounded-xl border border-[var(--strap-border)]">
          {keys.map((key) => {
            // Keys load client-side, so reading the clock here cannot mismatch server HTML.
            const expired = key.expiresAt !== null && new Date(key.expiresAt).getTime() <= Date.now();
            return (
            <div key={key.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[14px] font-medium">{key.name}</div>
                  <div className="mt-1 text-[12px] text-[var(--strap-text-tertiary)]">
                    <span className="font-mono">{key.prefix}…</span> · {MODE_LABEL[key.mode]} · {key.revokedAt ? "Revoked" : expired ? "Expired" : key.expiresAt ? `Expires ${new Date(key.expiresAt).toLocaleDateString()}` : "No expiry"}
                  </div>
                  <p className="mt-1 text-xs text-[var(--strap-text-secondary)]">{grantSummary(key)}</p>
                </div>
                {!key.revokedAt && expired ? (
                  <Button size="icon" variant="ghost" aria-label={`Revoke ${key.name}`} title="Revoke key" onClick={() => void revokeKey(key.id)}><Trash2 className="h-4 w-4" /></Button>
                ) : !key.revokedAt ? (
                  <div className="flex items-center gap-1">
                    {canUseVault && vaultLoaded ? <Button size="icon" variant="ghost" aria-label={`Edit secret access for ${key.name}`} title="Edit secret access" onClick={() => editGrants(key)}><ShieldCheck className="h-4 w-4" /></Button> : null}
                    <Button size="icon" variant="ghost" aria-label={`Rotate ${key.name}`} title="Rotate key value" disabled={busy} onClick={() => void rotateKey(key)}><RefreshCw className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label={`Revoke ${key.name}`} title="Revoke key" onClick={() => void revokeKey(key.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ) : null}
              </div>
              {editing?.keyId === key.id ? (
                <fieldset disabled={busy} className="mt-4 flex flex-col gap-3 rounded-lg border border-[var(--strap-border)] p-4">
                  <legend className="px-1 text-sm font-medium">Secret access for {key.name}</legend>
                  <p className="text-xs leading-5 text-[var(--strap-text-secondary)]">Changes apply on the key&apos;s next request. The key value stays the same.</p>
                  <VaultGrantPicker folders={vaultFolders} items={vaultItems} value={editing.grants} onChange={(value) => setEditing((current) => current ? { ...current, grants: value } : current)} disabled={busy} />
                  <div className="flex gap-3"><Button onClick={() => void saveGrants()}>{busy ? "Saving…" : "Save access"}</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
                </fieldset>
              ) : null}
            </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
