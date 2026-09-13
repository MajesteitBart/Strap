import { ConsentShell } from "@/components/strap/consent-shell";

const MISSING_TABLES = [
  "creed_sections",
  "creed_proposals",
  "creed_activity",
  "creed_connections",
  "creed_tokens",
] as const;

export function BackendSetupScreen({
  errorMessage,
}: {
  errorMessage?: string;
}) {
  return (
    <ConsentShell chip="Backend setup needed" tone="warning" wide>
      <h1>Auth is working. The Strap tables just aren&apos;t live yet.</h1>
      <p>
        Your Supabase project is connected, but the schema migration still needs to be run
        once before Strap can persist sections, proposals, activity, connections, and
        tokens.
      </p>
      <div className="strap-consent-form">
        <div className="strap-notice">
          Apply the SQL in <code className="strap-mono">supabase/migrations/20260403190000_init_creed.sql</code> to
          your Supabase project, then reload.
        </div>
        <ul className="strap-consent-list" aria-label="Missing tables">
          {MISSING_TABLES.map((table) => (
            <li key={table}>
              <span>{table}</span>
              <span>missing</span>
            </li>
          ))}
        </ul>
        {errorMessage ? (
          <div className="strap-notice strap-notice-warning" role="alert">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </ConsentShell>
  );
}
