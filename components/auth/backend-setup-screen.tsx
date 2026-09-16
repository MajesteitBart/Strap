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
        Your database is connected, but the schema migration still needs to be run
        once before Strap can persist sections, proposals, activity, connections, and
        tokens.
      </p>
      <div className="strap-consent-form">
        <div className="strap-notice">
          Run <code className="strap-mono">npm run db:migrate</code>, then reload.
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
