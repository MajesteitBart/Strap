import {
  StrapSiteFooter,
  StrapSiteHeader,
} from "@/components/marketing/strap-site-shell";
import { isDatabaseConfigured } from "@/lib/env";
import Link from "next/link";

// 404 for any unmatched route under the app router. Rendered on the public
// worktable so it reads as part of Strap rather than a Next.js default page.
export default function NotFound() {
  return (
    <div className="strap-site">
      <StrapSiteHeader configured={isDatabaseConfigured()} />
      <main className="strap-wrap strap-empty strap-tone-agents">
        <span className="strap-empty-code">404 · not found</span>
        <h1>Page not found</h1>
        <p>
          That URL doesn&apos;t resolve to anything on Strap. Double-check the
          link, or jump back to a page we know exists.
        </p>
        <div className="strap-actions">
          <Link className="strap-button strap-button-primary" href="/home">
            Back home
          </Link>
          <Link className="strap-button strap-button-secondary" href="/docs">
            Read the docs
          </Link>
        </div>
      </main>
      <StrapSiteFooter />
    </div>
  );
}
