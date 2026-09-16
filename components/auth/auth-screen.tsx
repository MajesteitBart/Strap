"use client";


import { AuthCheckbox, AuthField, AuthSubmitButton, PasswordField } from "@/components/auth/auth-fields";
import { AuthShell } from "@/components/auth/auth-shell";
import { readLastAuthProvider, useOAuthSignIn, type OAuthProvider } from "@/components/auth/use-oauth-sign-in";
import { authClient } from "@/lib/auth/client";
import { LoaderCircle, MailCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

type AuthMode = "login" | "signup";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const copy: Record<AuthMode, {
  heading: string;
  lede: string;
  submit: string;
  switchPrompt: string;
  switchAction: string;
  switchHref: string;
  topAction: string;
  topHref: string;
}> = {
  login: {
    heading: "Welcome back",
    lede: "Sign in to open your Strap and the agents connected to it.",
    submit: "Sign in",
    switchPrompt: "New to Strap?",
    switchAction: "Create an account",
    switchHref: "/signup",
    topAction: "Sign up",
    topHref: "/signup",
  },
  signup: {
    heading: "Create your account",
    lede: "One profile every connected agent reads before it works.",
    submit: "Create account",
    switchPrompt: "Already have an account?",
    switchAction: "Sign in",
    switchHref: "/login",
    topAction: "Sign in",
    topHref: "/login",
  },
};

function authErrorMessage(message: string, mode: AuthMode) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid email or password")) {
    return "That email or password is incorrect.";
  }
  if (m.includes("email not confirmed") || m.includes("email not verified")) {
    return "Confirm your email first, then sign in. Check your inbox.";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "An account with this email already exists.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  if (mode === "signup" && m.includes("password")) {
    return "Choose a stronger password.";
  }
  return message || "Something went wrong. Try again.";
}

type Confirmation = { email: string; kind: "signup" | "reset" };

export function AuthScreen({
  mode,
  configured = true,
  nextPath = "/",
}: {
  mode: AuthMode;
  configured?: boolean;
  // Where to land after a successful auth (e.g. back to /authorize for an MCP
  // connect). Defaults to the root router.
  nextPath?: string;
}) {
  const t = copy[mode];
  const isSignup = mode === "signup";

  // Carry the post-auth destination across the login <-> signup switch so an
  // invited visitor who taps "Create an account" keeps returning to their
  // invite. Without this the switch links drop `next` and a new user lands at
  // the app root, never joining the team.
  const withNext = (href: string) =>
    nextPath && nextPath !== "/" ? `${href}?next=${encodeURIComponent(nextPath)}` : href;

  const { signIn: oauthSignIn, pendingProvider } = useOAuthSignIn(configured, nextPath);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const [lastProvider, setLastProvider] = useState<OAuthProvider | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    // Set true on (re)mount, not just at init - otherwise React StrictMode's
    // dev mount/unmount/remount leaves it stuck false and we skip the
    // setSubmitting(false) in the finally, hanging the spinner after an error.
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Read after mount to avoid a hydration mismatch (localStorage is client-only).
  useEffect(() => {
    setLastProvider(readLastAuthProvider());
  }, []);

  // While the signup "check your inbox" screen is up, watch for the session to
  // appear (the user confirms in another tab in the same browser) and log this
  // tab in automatically.
  useEffect(() => {
    if (confirmation?.kind !== "signup") return;
    let active = true;
    const checkSession = async () => {
      const { data } = await authClient.getSession();
      if (active && data?.session) window.location.assign(nextPath);
    };
    const intervalId = window.setInterval(() => void checkSession(), 3000);

    return () => {
      active = false;
      window.clearInterval(intervalId);

    };
  }, [confirmation, nextPath]);

  const busy = submitting || pendingProvider !== null;

  function validate() {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) {
      next.email = "Enter your email.";
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (!password) {
      next.password = "Enter your password.";
    } else if (isSignup && password.length < 8) {
      next.password = "Use at least 8 characters.";
    }
    return next;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !configured) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (nextErrors.email) {
      emailRef.current?.focus();
      return;
    }
    if (nextErrors.password) {
      passwordRef.current?.focus();
      return;
    }

    const trimmedEmail = email.trim();
    setSubmitting(true);

    try {
      if (mode === "login") {
        const { error } = await authClient.signIn.email({
          email: trimmedEmail,
          password,
          rememberMe: remember,
        });
        if (error) {
          toast.error(authErrorMessage(error.message ?? "", mode));
          return;
        }
        // Full navigation so server components pick up the new session.
        window.location.assign(nextPath);
        return;
      }

      const { error } = await authClient.signUp.email({
        email: trimmedEmail,
        password,
        name: trimmedEmail.split("@")[0],
        callbackURL: new URL(nextPath, window.location.origin).toString(),
      });
      if (error) {
        toast.error(authErrorMessage(error.message ?? "", mode));
        return;
      }
      // Confirmation is required; duplicate addresses get the same response.
      setConfirmation({ email: trimmedEmail, kind: "signup" });
    } finally {
      if (mounted.current) setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    if (busy || !configured) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
      setErrors((e) => ({ ...e, email: "Enter your email to reset your password." }));
      emailRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
        const { error } = await authClient.requestPasswordReset({ email: trimmedEmail, redirectTo: `${window.location.origin}/reset-password` });
      if (error) {
        toast.error(error.message || "Couldn't send the reset link. Try again.");
        return;
      }
      // Unknown email resets also return success to prevent account enumeration, so
      // we always land on the same confirmation state.
      setConfirmation({ email: trimmedEmail, kind: "reset" });
    } finally {
      if (mounted.current) setSubmitting(false);
    }
  }

  return (
    <AuthShell
      topRight={
        <Link href={withNext(t.topHref)} className="strap-link-plain">
          {t.topAction}
        </Link>
      }
    >
      {confirmation ? (
        <ConfirmationNotice
          email={confirmation.email}
          kind={confirmation.kind}
          onBack={() => {
            setConfirmation(null);
            setPassword("");
          }}
        />
      ) : (
        <>
          <span className="strap-kicker strap-kicker-context">{isSignup ? "Create account" : "Sign in"}</span>
          <h1>{t.heading}</h1>
          <p>{t.lede}</p>

          <div className="strap-auth-providers">
            <ProviderButton
              onClick={() => void oauthSignIn("google")}
              disabled={busy || !configured}
              lastUsed={lastProvider === "google"}
              icon={<GoogleIcon />}
            >
              {pendingProvider === "google" ? (
                <>
                  Redirecting
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                </>
              ) : (
                <>Sign in with Google</>
              )}
            </ProviderButton>

            <ProviderButton
              onClick={() => void oauthSignIn("x")}
              disabled={busy || !configured}
              lastUsed={lastProvider === "x"}
              icon={<XIcon />}
            >
              {pendingProvider === "x" ? (
                <>
                  Redirecting
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                </>
              ) : (
                <>Sign in with X</>
              )}
            </ProviderButton>
          </div>

          <div className="strap-divider" aria-hidden="true">
            or
          </div>

          <form onSubmit={handleSubmit} noValidate className="strap-form">
            <AuthField
              ref={emailRef}
              type="email"
              label="Email"
              autoComplete="email"
              value={email}
              disabled={busy}
              error={errors.email}
              onChange={(value) => {
                setEmail(value);
                if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
              }}
            />

            <PasswordField
              inputRef={passwordRef}
              label="Password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              disabled={busy}
              error={errors.password}
              onChange={(value) => {
                setPassword(value);
                if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
              }}
            />

            {!isSignup ? (
              <div className="strap-form-row">
                <label>
                  <AuthCheckbox checked={remember} onChange={() => setRemember((v) => !v)} />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => void handleForgotPassword()}
                  disabled={busy}
                  className="strap-form-link"
                >
                  Forgot password?
                </button>
              </div>
            ) : null}

            <AuthSubmitButton
              label={t.submit}
              loading={submitting}
              disabled={busy || !configured}
            />
          </form>

          <p className="strap-auth-switch">
            {t.switchPrompt}{" "}
            <Link href={withNext(t.switchHref)} className="strap-link-plain">
              {t.switchAction}
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}

function ConfirmationNotice({
  email,
  kind,
  onBack,
}: {
  email: string;
  kind: "signup" | "reset";
  onBack: () => void;
}) {
  const body =
    kind === "signup"
      ? "Click it to finish creating your account."
      : "Click it to choose a new password.";
  const lead = kind === "signup" ? "We sent a confirmation link to" : "We sent a password reset link to";

  return (
    <div className="strap-auth-centered">
      <div className="strap-auth-glyph">
        <MailCheck className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1>Check your inbox</h1>
      <p>
        {lead} <strong>{email}</strong>. {body}
      </p>
      <div className="strap-actions">
        <button type="button" onClick={onBack} className="strap-button strap-button-secondary">
          Use a different email
        </button>
      </div>
    </div>
  );
}

function ProviderButton({
  children,
  icon,
  onClick,
  disabled,
  lastUsed,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  lastUsed?: boolean;
}) {
  return (
    <span className="strap-provider">
      {lastUsed ? <span className="strap-provider-badge">Last used</span> : null}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="strap-button strap-button-secondary strap-button-block strap-button-icon"
      >
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center" aria-hidden="true">
          {icon}
        </span>
        {children}
      </button>
    </span>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[15px] w-[15px]" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
