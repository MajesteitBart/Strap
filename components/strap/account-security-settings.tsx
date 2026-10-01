"use client";

// Settings card for account MFA: authenticator-app enrollment with proof,
// recovery code regeneration and disabling. Management actions re-ask for the
// password (when the account has one) and a current code; see lib/auth/mfa.ts.

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Status = { enabled: boolean; hasPassword: boolean };
type Flow = "enable" | "disable" | "regenerate";
type Setup = { uri: string; key: string; backupCodes: string[] };

const inputClass = "h-11 rounded-xl border-[var(--strap-border)] bg-[var(--strap-surface)] px-4 text-[15px]";

function setupKey(uri: string) {
  const secret = new URL(uri).searchParams.get("secret") ?? "";
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

function errorMessage(error: { message?: string; code?: string } | null | undefined, fallback: string) {
  const text = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  if (text.includes("password")) return "That password is incorrect.";
  if (text.includes("session_not_fresh") || text.includes("sign in again")) return "Sign out and back in, then try again.";
  if (text.includes("too many")) return "Too many attempts. Wait a moment and try again.";
  if (text.includes("code")) return "That code didn't work. Try a current code.";
  return fallback;
}

export function AccountSecuritySettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [session, accounts] = await Promise.all([
      authClient.getSession({ query: { disableCookieCache: true } }),
      authClient.listAccounts(),
    ]);
    setStatus({
      enabled: Boolean(session.data?.user.twoFactorEnabled),
      hasPassword: Boolean(accounts.data?.some((account) => account.providerId === "credential")),
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function open(next: Flow) {
    setFlow(next);
    setPassword("");
    setCode("");
    setSetup(null);
    setNewCodes(null);
  }

  function close() {
    if (busy) return;
    setFlow(null);
    setPassword("");
    setCode("");
    setSetup(null);
    setNewCodes(null);
  }

  async function startEnrollment() {
    setBusy(true);
    try {
      const { data, error } = await authClient.twoFactor.enable(status?.hasPassword ? { password } : {});
      if (error || !data || !("totpURI" in data) || !data.totpURI) {
        toast.error(errorMessage(error, "Couldn't start setup. Try again."));
        return;
      }
      setSetup({ uri: data.totpURI, key: setupKey(data.totpURI), backupCodes: data.backupCodes ?? [] });
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnrollment() {
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await authClient.twoFactor.verifyTotp({ code: code.trim() });
      if (error) {
        toast.error(errorMessage(error, "That code didn't work."));
        return;
      }
      toast.success("Two-factor authentication is on");
      setFlow(null);
      setSetup(null);
      setCode("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function manage(action: "disable" | "regenerate") {
    if (!code.trim()) {
      toast.error("Enter an authenticator code or a recovery code.");
      return;
    }
    setBusy(true);
    try {
      const path = action === "disable" ? "/two-factor/disable" : "/two-factor/generate-backup-codes";
      const body = { code: code.trim(), ...(status?.hasPassword ? { password } : {}) };
      const { data, error } = await authClient.$fetch<{ backupCodes?: string[] }>(path, { method: "POST", body });
      if (error) {
        toast.error(errorMessage(error, "Couldn't confirm this change."));
        return;
      }
      setPassword("");
      setCode("");
      if (action === "disable") {
        toast.success("Two-factor authentication is off");
        setFlow(null);
        await refresh();
      } else {
        setNewCodes(data?.backupCodes ?? []);
      }
    } finally {
      setBusy(false);
    }
  }

  const passwordField = status?.hasPassword ? (
    <label className="block">
      <span className="mb-2 block text-[14px] font-medium text-[var(--strap-text-secondary)]">Password</span>
      <Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
    </label>
  ) : null;

  return (
    <section id="account-security" className="scroll-mt-6">
      <h2 className="text-[16px] font-medium text-[var(--strap-text-primary)]">Security</h2>
      <div className="mt-4 rounded-[var(--radius-xl)] border border-[var(--strap-border)] bg-[var(--strap-surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[15px] font-medium text-[var(--strap-text-primary)]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Two-factor authentication
              <span
                className="rounded-full border border-[var(--strap-border)] px-2 py-0.5 text-[12px] font-medium text-[var(--strap-text-secondary)]"
                data-testid="mfa-status"
              >
                {status === null ? "Checking" : status.enabled ? "On" : "Off"}
              </span>
            </div>
            <p className="mt-2 text-[14px] leading-6 text-[var(--strap-text-secondary)]">
              {status?.enabled
                ? "Every new sign-in asks for a code from your authenticator app or a recovery code."
                : "Protect your Strap, Company access and Vault with a code from an authenticator app."}
            </p>
          </div>
          {status === null ? null : status.enabled ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-md border-[var(--strap-border)]" onClick={() => open("regenerate")}>
                New recovery codes
              </Button>
              <Button variant="outline" className="rounded-md border-[var(--strap-border)]" onClick={() => open("disable")}>
                Turn off
              </Button>
            </div>
          ) : (
            <Button className="rounded-md" onClick={() => open("enable")}>
              Set up
            </Button>
          )}
        </div>
      </div>

      <Dialog open={flow !== null} onOpenChange={(value) => (!value ? close() : undefined)}>
        <DialogContent className="rounded-[var(--radius-xl)] border-[var(--strap-frame)] bg-[var(--strap-surface)]">
          {flow === "enable" && !setup ? (
            <>
              <DialogHeader>
                <DialogTitle>Set up two-factor authentication</DialogTitle>
                <DialogDescription>
                  Use an authenticator app such as 1Password, Google Authenticator or Authy. Other signed-in devices are signed out once setup finishes.
                </DialogDescription>
              </DialogHeader>
              {passwordField}
              <DialogFooter>
                <Button variant="ghost" className="rounded-md" onClick={close} disabled={busy}>Cancel</Button>
                <Button className="rounded-md" onClick={() => void startEnrollment()} disabled={busy || (Boolean(status?.hasPassword) && !password)}>
                  {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  Continue
                </Button>
              </DialogFooter>
            </>
          ) : null}

          {flow === "enable" && setup ? (
            <>
              <DialogHeader>
                <DialogTitle>Add Strap to your authenticator</DialogTitle>
                <DialogDescription>
                  Enter this setup key in your app, or open the link on the device that has the app. It is only shown now.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--strap-border)] p-4">
                  <div className="text-[13px] text-[var(--strap-text-secondary)]">Setup key</div>
                  <code className="mt-1 block break-all font-mono text-[15px] text-[var(--strap-text-primary)]" data-testid="mfa-setup-key">{setup.key}</code>
                  <a href={setup.uri} className="mt-2 inline-block text-[14px] underline underline-offset-4">Open in authenticator app</a>
                </div>
                <RecoveryCodes codes={setup.backupCodes} />
                <label className="block">
                  <span className="mb-2 block text-[14px] font-medium text-[var(--strap-text-secondary)]">6-digit code from the app</span>
                  <Input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} className={inputClass} />
                </label>
              </div>
              <DialogFooter>
                <Button variant="ghost" className="rounded-md" onClick={close} disabled={busy}>Cancel</Button>
                <Button className="rounded-md" onClick={() => void confirmEnrollment()} disabled={busy}>
                  {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  Turn on
                </Button>
              </DialogFooter>
            </>
          ) : null}

          {(flow === "disable" || flow === "regenerate") && !newCodes ? (
            <>
              <DialogHeader>
                <DialogTitle>{flow === "disable" ? "Turn off two-factor authentication" : "Create new recovery codes"}</DialogTitle>
                <DialogDescription>
                  {flow === "disable"
                    ? "New sign-ins will only need your password or provider. Confirm with a current code."
                    : "Your current recovery codes stop working. Confirm with a current code."}
                </DialogDescription>
              </DialogHeader>
              {passwordField}
              <label className="block">
                <span className="mb-2 block text-[14px] font-medium text-[var(--strap-text-secondary)]">Authenticator code or recovery code</span>
                <Input autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} className={inputClass} />
              </label>
              <DialogFooter>
                <Button variant="ghost" className="rounded-md" onClick={close} disabled={busy}>Cancel</Button>
                <Button
                  className={flow === "disable" ? "rounded-md bg-[var(--strap-danger-fill)] text-white hover:bg-[var(--strap-danger-fill-hover)]" : "rounded-md"}
                  onClick={() => void manage(flow)}
                  disabled={busy || !code || (Boolean(status?.hasPassword) && !password)}
                >
                  {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {flow === "disable" ? "Turn off" : "Create codes"}
                </Button>
              </DialogFooter>
            </>
          ) : null}

          {flow === "regenerate" && newCodes ? (
            <>
              <DialogHeader>
                <DialogTitle>Save your new recovery codes</DialogTitle>
                <DialogDescription>They are only shown now. Each code works once.</DialogDescription>
              </DialogHeader>
              <RecoveryCodes codes={newCodes} />
              <DialogFooter>
                <Button className="rounded-md" onClick={close}>Done</Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function RecoveryCodes({ codes }: { codes: string[] }) {
  const text = codes.join("\n");
  function download() {
    const url = URL.createObjectURL(new Blob([`${text}\n`], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "strap-recovery-codes.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="rounded-xl border border-[var(--strap-border)] p-4">
      <div className="text-[13px] text-[var(--strap-text-secondary)]">Recovery codes. Store them somewhere safe; each works once.</div>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[14px] text-[var(--strap-text-primary)]" data-testid="mfa-recovery-codes">
        {codes.map((value) => <li key={value}>{value}</li>)}
      </ul>
      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-md border-[var(--strap-border)]"
          onClick={() => void navigator.clipboard.writeText(text).then(() => toast.success("Recovery codes copied"))}
        >
          Copy
        </Button>
        <Button variant="outline" size="sm" className="rounded-md border-[var(--strap-border)]" onClick={download}>
          Download
        </Button>
      </div>
    </div>
  );
}
