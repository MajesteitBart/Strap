"use client";

// Shared worktable chrome for the auth surface: the form column (wordmark,
// optional top-right link, centred content, footer) and the flat kit panel on
// the right. /login, /signup and /reset-password all render inside it so they
// stay visually identical to each other and to the public site.

import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT_MAILTO } from "@/lib/branding";

const manifest = [
  { kind: "context", label: "context · available", source: "Personal + Company", ready: true },
  { kind: "skills", label: "skills · roadmap", source: "not shipped", ready: false },
  { kind: "secrets", label: "keys · available", source: "Vault + headless access", ready: true },
] as const;

export function AuthShell({ topRight, children }: { topRight?: ReactNode; children: ReactNode }) {
  return (
    <div className="strap-site strap-auth">
      <div className="strap-auth-form">
        <div className="strap-auth-top">
          <Link className="strap-wordmark" href="/home" aria-label="Strap home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/brand/strap-logo.svg" width="1003" height="257" alt="Strap" />
          </Link>
          {topRight ? <div>{topRight}</div> : null}
        </div>

        <div className="strap-auth-body">
          <div className="strap-auth-card">{children}</div>
        </div>

        <div className="strap-auth-foot">
          <span>© 2026 Strap</span>
          <span className="strap-footer-links">
            <a href={CONTACT_MAILTO}>Contact</a>
            <Link href="/docs">Docs</Link>
            <Link href="/privacy">Privacy</Link>
          </span>
        </div>
      </div>

      {/* Decorative kit panel (hidden below the desktop breakpoint). It mirrors
          the homepage manifest so the sign-in screen reads as the same product. */}
      <aside className="strap-auth-panel" aria-hidden="true">
        <div className="strap-kit">
          <span className="strap-backing strap-backing-one" />
          <span className="strap-backing strap-backing-two" />
          <div className="strap-manifest">
            <span className="strap-chip strap-chip-ready">Ready</span>
            <div className="strap-manifest-head">
              <span className="strap-mono">
                <b>strap.md</b> · read before every task
              </span>
            </div>
            {manifest.map((line) => (
              <div className="strap-manifest-line" key={line.kind}>
                <span className={`strap-swatch strap-bg-${line.kind}`} />
                <span>{line.label}</span>
                <span className="strap-manifest-source">{line.source}</span>
                <span className="strap-check">{line.ready ? "✓" : "△"}</span>
              </div>
            ))}
            <div className="strap-pattern" />
          </div>
          <div className="strap-manifest-cta">
            <span>Connected agents read this first</span>
            <span>→</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
