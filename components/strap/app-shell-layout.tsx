"use client";

import { useEffect, type ReactNode } from "react";
import { StrapShell } from "@/components/strap/shell";
import { GettingStartedCard } from "@/components/strap/getting-started-card";
import { QualityToasts } from "@/components/strap/quality-toasts";
import { WelcomeDialog } from "@/components/strap/welcome-dialog";
import { WelcomeVideoPreloader } from "@/components/strap/welcome-video-preloader";
import { useStrap } from "@/components/strap/strap-provider";
import { setWelcomePreviewVariant } from "@/lib/welcome-preview";

const IS_DEV = process.env.NODE_ENV !== "production";

export function AppShellLayout({
  children,
  showWelcome = false,
  welcomePaidAt = null,
}: {
  children: ReactNode;
  showWelcome?: boolean;
  welcomePaidAt?: string | null;
}) {
  const { state } = useStrap();
  const variant = state.creedType === "company" ? "company" : "personal";

  // Publish the active space's variant so the root P-preview shortcut opens the
  // matching tour (company inside a company space, personal otherwise).
  useEffect(() => {
    setWelcomePreviewVariant(variant);
  }, [variant]);

  return (
    <>
      {/* Mounted at the shell so a completion toast fires regardless of which
          app page is open when the analysis finishes. */}
      <QualityToasts />
      {/* Real first-run tour; self-gates on `show`. The dev P preview lives at
          the root (WelcomeDevPreview) so it works on any page. */}
      <WelcomeDialog show={showWelcome} paidAt={welcomePaidAt} variant={variant} />
      {/* Warm the tour's videos the moment the app shell mounts, but only when
          the tour will actually show (or in dev, for the P preview) so we don't
          pull videos for users who won't see it. Onboarding preloads too, for
          more lead time. */}
      {(showWelcome || IS_DEV) && <WelcomeVideoPreloader variant={variant} />}
      {/* Post-onboarding checklist; renders nothing once every step is done. */}
      <GettingStartedCard />
      <StrapShell
        userName={state.user.name}
        avatarInitials={state.user.avatarInitials}
        avatarUrl={state.user.avatarUrl}
        sections={state.sections}
      >
        {children}
      </StrapShell>
    </>
  );
}
