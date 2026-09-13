"use client";

import { useEffect } from "react";
import Link from "next/link";

// Route-level error boundary. Catches errors thrown by any server or
// client component below the root segment that doesn't have its own
// nested `error.tsx`. Pairs with the existing `global-error.tsx`, which
// only fires when the root layout itself throws.
//
// Rendered on the public worktable so the page doesn't look orphaned when it
// renders mid-flow. It stays chrome-free on purpose: the failing tree may be
// the one that owns navigation state.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to Vercel logs alongside the digest the user sees.
    console.error("[route-error]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="strap-site">
      <main className="strap-wrap strap-empty strap-tone-warning">
        <span className="strap-empty-code">Temporary error</span>
        <h1>Something went sideways</h1>
        <p>
          This is a temporary error. Try again, or head back to the home page.
          If it keeps happening, the digest below helps us track it down.
        </p>
        <div className="strap-actions">
          <button type="button" onClick={reset} className="strap-button strap-button-primary">
            Try again
          </button>
          <Link href="/home" className="strap-button strap-button-secondary">
            Back home
          </Link>
        </div>
        {error.digest ? (
          <code className="strap-empty-digest">digest: {error.digest}</code>
        ) : null}
      </main>
    </div>
  );
}
