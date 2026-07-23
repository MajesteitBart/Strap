"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Link2, Server, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreed } from "@/components/creed/creed-provider";
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
};

const MODE_LABEL: Record<HeadlessKeyMode, string> = {
  "read-only": "Read only",
  "proposal-only": "Read and propose",
  direct: "Permitted direct edits",
};

export function HeadlessAccessCard() {
  const { state } = useCreed();
  const creedId = state.creedId;
  const [keys, setKeys] = useState<KeyMetadata[]>([]);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<HeadlessKeyMode>("proposal-only");
  const [expiry, setExpiry] = useState("90");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ creedId, name: name.trim(), mode, expiresAt }),
      });
      const payload = (await response.json().catch(() => ({}))) as { key?: string; error?: string };
      if (!response.ok || !payload.key) throw new Error(payload.error || "Could not create API key.");
      setCreatedKey(payload.key);
      setName("");
      await loadKeys();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create API key.");
    } finally {
      setBusy(false);
    }
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
    await loadKeys();
  }

  return (
    <section className="mt-10">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--creed-surface-raised)] text-[var(--creed-text-secondary)]"><Server className="h-4 w-4" /></span>
        <div>
          <h2 className="text-[16px] font-medium text-[var(--creed-text-primary)]">Headless access</h2>
          <p className="mt-1 text-[14px] leading-6 text-[var(--creed-text-secondary)]">
            Connect remote agents with a scoped API key, or approve a device code on this browser.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--creed-border)] p-5">
          <div className="flex items-center gap-2 text-[15px] font-medium"><KeyRound className="h-4 w-4" /> Strap API key</div>
          <p className="mt-2 text-[13px] leading-6 text-[var(--creed-text-secondary)]">Use as the bearer token for the MCP URL above. The complete key is shown once.</p>
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
            <Button onClick={() => void createKey()} disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create API key"}</Button>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--creed-border)] p-5">
          <div className="flex items-center gap-2 text-[15px] font-medium"><Link2 className="h-4 w-4" /> Device authorization</div>
          <p className="mt-2 text-[13px] leading-6 text-[var(--creed-text-secondary)]">
            Agents that support OAuth device authorization show a short code. Enter it here, verify the client name, and choose one Strap.
          </p>
          <Button asChild variant="secondary" className="mt-4"><Link href="/device">Enter a device code</Link></Button>
          <p className="mt-3 text-[12px] leading-5 text-[var(--creed-text-tertiary)]">Never approve a code you did not start on your own agent.</p>
        </div>
      </div>

      {createdKey ? (
        <div className="mt-4 rounded-xl border border-[var(--creed-accent)]/40 bg-[var(--creed-accent)]/5 p-4">
          <div className="text-[14px] font-medium">Copy this key now</div>
          <p className="mt-1 text-[13px] text-[var(--creed-text-secondary)]">It cannot be revealed again after you leave this page.</p>
          <div className="mt-3 flex items-start gap-2">
            <code className="min-w-0 flex-1 break-all rounded-md bg-[var(--creed-surface)] px-3 py-2 text-[12px]">{createdKey}</code>
            <Button size="icon" variant="secondary" aria-label="Copy API key" onClick={() => void navigator.clipboard.writeText(createdKey)}><Copy className="h-4 w-4" /></Button>
          </div>
          <Button variant="ghost" className="mt-2" onClick={() => setCreatedKey(null)}>I saved it</Button>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-[13px] text-[var(--creed-danger)]">{error}</p> : null}

      {keys.length ? (
        <div className="mt-5 divide-y divide-[var(--creed-border)] rounded-xl border border-[var(--creed-border)]">
          {keys.map((key) => (
            <div key={key.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="text-[14px] font-medium">{key.name}</div>
                <div className="mt-1 text-[12px] text-[var(--creed-text-tertiary)]">
                  <span className="font-mono">{key.prefix}…</span> · {MODE_LABEL[key.mode]} · {key.revokedAt ? "Revoked" : key.expiresAt ? `Expires ${new Date(key.expiresAt).toLocaleDateString()}` : "No expiry"}
                </div>
              </div>
              {!key.revokedAt ? <Button size="icon" variant="ghost" aria-label={`Revoke ${key.name}`} onClick={() => void revokeKey(key.id)}><Trash2 className="h-4 w-4" /></Button> : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
