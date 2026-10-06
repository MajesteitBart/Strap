import Link from "@/components/link";
import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";

// Route-level error boundary for any route without its own errorComponent.
//
// Rendered on the public worktable so the page doesn't look orphaned when it
// renders mid-flow. It stays chrome-free on purpose: the failing tree may be
// the one that owns navigation state.
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const failure = error instanceof Error ? (error as Error & { digest?: string }) : null;
  const digest = failure?.digest;

  useEffect(() => {
    // Surface to the browser console alongside the digest the user sees.
    console.error("[route-error]", {
      message: failure?.message ?? String(error),
      digest,
      stack: failure?.stack,
    });
  }, [error, failure, digest]);

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
          <button
            type="button"
            onClick={() => {
              reset();
              void router.invalidate();
            }}
            className="strap-button strap-button-primary"
          >
            Try again
          </button>
          <Link href="/home" className="strap-button strap-button-secondary">
            Back home
          </Link>
        </div>
        {digest ? <code className="strap-empty-digest">digest: {digest}</code> : null}
      </main>
    </div>
  );
}
