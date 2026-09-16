"use client";

// Better Auth consumes the one-time reset token and revokes existing sessions.

import { AuthSubmitButton, PasswordField } from "@/components/auth/auth-fields";
import { AuthShell } from "@/components/auth/auth-shell";
import { authClient } from "@/lib/auth/client";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Status = "checking" | "ready" | "invalid";

export function ResetPasswordScreen({ configured = true }: { configured?: boolean }) {
  const [status, setStatus] = useState<Status>(configured ? "checking" : "invalid");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const resetToken = useRef<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    // Set true on (re)mount so React StrictMode's dev remount doesn't leave it
    // stuck false and skip the finally's setSubmitting(false).
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!configured) return;
    const params = new URLSearchParams(window.location.search);
    resetToken.current = params.get("token");
    setStatus(resetToken.current && !params.has("error") ? "ready" : "invalid");
  }, [configured]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const next: { password?: string; confirm?: string } = {};
    if (!password) {
      next.password = "Enter a new password.";
    } else if (password.length < 8) {
      next.password = "Use at least 8 characters.";
    }
    if (confirm !== password) {
      next.confirm = "Passwords do not match.";
    }
    setErrors(next);
    if (next.password) {
      passwordRef.current?.focus();
      return;
    }
    if (next.confirm) return;

    setSubmitting(true);
    try {

      const { error } = await authClient.resetPassword({ newPassword: password, token: resetToken.current ?? "" });
      if (error) {
        toast.error(error.message || "Couldn't update your password. Try again.");
        return;
      }
      toast.success("Password updated.");
      // Full navigation so the app routes the now-signed-in user correctly.
      window.location.assign("/login");
    } finally {
      if (mounted.current) setSubmitting(false);
    }
  }

  return (
    <AuthShell
      topRight={
        <Link href="/login" className="strap-link-plain">
          Sign in
        </Link>
      }
    >
      {status === "checking" ? (
        <div className="strap-auth-spinner" role="status" aria-live="polite">
          <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span className="sr-only">Checking your reset link</span>
        </div>
      ) : status === "invalid" ? (
        <div className="strap-auth-centered">
          <span className="strap-kicker strap-kicker-paper">Reset link</span>
          <h1>Link expired</h1>
          <p>
            This password reset link is invalid or has already been used. Request a new one from the sign-in screen.
          </p>
          <div className="strap-actions">
            <Link href="/login" className="strap-button strap-button-secondary">
              Back to sign in
            </Link>
          </div>
        </div>
      ) : (
        <>
          <span className="strap-kicker strap-kicker-secrets">Reset password</span>
          <h1>Set a new password</h1>
          <p>Choose at least 8 characters. Sign in with your new password once it is saved.</p>
          <form onSubmit={handleSubmit} noValidate className="strap-form" style={{ marginTop: "1.75rem" }}>
            <PasswordField
              inputRef={passwordRef}
              label="New password"
              autoComplete="new-password"
              value={password}
              disabled={submitting}
              error={errors.password}
              onChange={(value) => {
                setPassword(value);
                if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
              }}
            />
            <PasswordField
              label="Confirm password"
              autoComplete="new-password"
              value={confirm}
              disabled={submitting}
              error={errors.confirm}
              onChange={(value) => {
                setConfirm(value);
                if (errors.confirm) setErrors((e) => ({ ...e, confirm: undefined }));
              }}
            />
            <AuthSubmitButton label="Update password" loading={submitting} disabled={submitting} />
          </form>
        </>
      )}
    </AuthShell>
  );
}
