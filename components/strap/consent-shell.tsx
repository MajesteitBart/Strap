import Link from "next/link";
import type { ReactNode } from "react";

// Shared worktable frame for the small, chrome-free decision pages: OAuth
// consent (/authorize), device authorization (/device), Company invites
// (/invite/[token]), and the backend setup notice. One centred framed card
// with a chip label and two offset backing shapes, matching the homepage kit.
export function ConsentShell({
  chip,
  tone = "context",
  wide = false,
  children,
}: {
  chip: string;
  tone?: "context" | "skills" | "secrets" | "environments" | "agents" | "warning";
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`strap-site strap-consent strap-tone-${tone}`}>
      <Link className="strap-consent-brand" href="/home" aria-label="Strap home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/brand/strap-logo.svg" width="1003" height="257" alt="Strap" />
      </Link>
      <div className={wide ? "strap-consent-kit strap-consent-kit-wide" : "strap-consent-kit"}>
        <span className="strap-consent-backing strap-consent-backing-one" aria-hidden="true" />
        <span className="strap-consent-backing strap-consent-backing-two" aria-hidden="true" />
        <main className="strap-consent-card">
          <span className="strap-chip">{chip}</span>
          {children}
        </main>
      </div>
    </div>
  );
}

export function ConsentMessage({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <>
      <h1>{title}</h1>
      <p>{body}</p>
      {children}
    </>
  );
}
