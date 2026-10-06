"use client";

// Second step of sign-in for accounts with MFA. Better Auth holds the pending
// challenge in a short-lived signed cookie; this screen only submits the code.

import { AuthField, AuthSubmitButton } from "@/components/auth/auth-fields";
import { AuthShell } from "@/components/auth/auth-shell";
import { authClient } from "@/lib/auth/client";
import Link from "@/components/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

type Method = "totp" | "recovery";

function challengeErrorMessage(message: string, method: Method) {
  const m = message.toLowerCase();
  if (m.includes("too many") || m.includes("locked")) {
    return "Too many attempts. Sign in again in a few minutes.";
  }
  if (m.includes("cookie") || m.includes("expired")) {
    return "This sign-in expired. Sign in again.";
  }
  return method === "totp" ? "That code did not work. Try the current code." : "That recovery code did not work.";
}

export function TwoFactorScreen({ nextPath = "/" }: { nextPath?: string }) {
  const [method, setMethod] = useState<Method>("totp");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const loginHref = nextPath !== "/" ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const value = code.trim();
    if (method === "totp" && !/^\d{6}$/.test(value)) {
      setError("Enter the 6-digit code from your authenticator app.");
      inputRef.current?.focus();
      return;
    }
    if (method === "recovery" && !value) {
      setError("Enter one of your recovery codes.");
      inputRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const { error: failure } = method === "totp"
        ? await authClient.twoFactor.verifyTotp({ code: value })
        : await authClient.twoFactor.verifyBackupCode({ code: value });
      if (failure) {
        const message = challengeErrorMessage(failure.message ?? "", method);
        setError(message);
        toast.error(message);
        return;
      }
      // Full navigation so the server-side gates pick up the new session.
      window.location.assign(nextPath);
    } finally {
      setSubmitting(false);
    }
  }

  function switchMethod() {
    setMethod((current) => (current === "totp" ? "recovery" : "totp"));
    setCode("");
    setError(undefined);
    inputRef.current?.focus();
  }

  return (
    <AuthShell
      topRight={
        <Link href={loginHref} className="strap-link-plain">
          Back to sign in
        </Link>
      }
    >
      <span className="strap-kicker strap-kicker-context">Two-factor authentication</span>
      <h1>{method === "totp" ? "Enter your code" : "Use a recovery code"}</h1>
      <p>
        {method === "totp"
          ? "Open your authenticator app and enter the 6-digit code for Strap."
          : "Each recovery code works once. Set up your authenticator again after signing in."}
      </p>

      <form onSubmit={handleSubmit} noValidate className="strap-form">
        <AuthField
          ref={inputRef}
          type="text"
          label={method === "totp" ? "Authentication code" : "Recovery code"}
          autoComplete="one-time-code"
          value={code}
          disabled={submitting}
          error={error}
          onChange={(value) => {
            setCode(value);
            if (error) setError(undefined);
          }}
        />
        <AuthSubmitButton label="Verify" loading={submitting} disabled={submitting} />
      </form>

      <p className="strap-auth-switch">
        {method === "totp" ? "Lost your device?" : "Have your authenticator?"}{" "}
        <button type="button" onClick={switchMethod} className="strap-link-plain">
          {method === "totp" ? "Use a recovery code" : "Use an authentication code"}
        </button>
      </p>
    </AuthShell>
  );
}
