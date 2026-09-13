"use client";

// Final step of the forgot-password flow, rendered at /reset-password. The
// recovery link is exchanged for a session by /auth/callback before landing
// here, so we just confirm a session exists, take the new password, and call
// updateUser. No session -> the link was invalid or already used.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthSubmitButton, PasswordField } from "@/components/auth/auth-fields";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Status = "checking" | "ready" | "invalid";

export function ResetPasswordScreen({ configured = true }: { configured?: boolean }) {
  const [status, setStatus] = useState<Status>(configured ? "checking" : "invalid");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [submitting, setSubmitting] = useState(false);

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
    const supabase = getSupabaseBrowserClient();
    let active = true;
    void supabase.auth.getUser().then((result: { data: { user: unknown } }) => {
      if (!active) return;
      setStatus(result.data.user ? "ready" : "invalid");
    });
    return () => {
      active = false;
    };
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
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message || "Couldn't update your password. Try again.");
        return;
      }
      toast.success("Password updated.");
      // Full navigation so the app routes the now-signed-in user correctly.
      window.location.assign("/");
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
          <p>Choose at least 8 characters. You will be signed in once it is saved.</p>
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
