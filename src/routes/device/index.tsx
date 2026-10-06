import Link from "@/components/link";
import { ConsentMessage, ConsentShell } from "@/components/strap/consent-shell";
import { createFileRoute } from "@tanstack/react-router";
import { getDeviceView } from "../../functions/consent";

const MODE_LABELS = {
  "read-only": "Read only",
  "proposal-only": "Read and propose",
  direct: "Allow permitted direct edits",
} as const;

// Device authorization: enter the code a headless agent shows, then approve
// it for one Strap. The forms POST to /device/verify and /device/decision.
export const Route = createFileRoute("/device/")({
  loaderDeps: ({ search }) => ({ search: search as Record<string, unknown> }),
  loader: ({ deps }) => getDeviceView({ data: deps.search }),
  gcTime: 0,
  component: DevicePage,
});

function DevicePage() {
  const view = Route.useLoaderData();

  if (view.kind === "sign-in") {
    return (
      <ConsentShell chip="Device authorization" tone="secrets">
        <ConsentMessage
          title="Sign in to connect a device"
          body="Sign in first, then enter the code shown by your headless agent."
        />
        <div className="strap-consent-actions strap-consent-actions-single">
          <Link className="strap-button strap-button-primary" href="/login?next=/device">
            Sign in
          </Link>
        </div>
      </ConsentShell>
    );
  }

  if (view.kind === "result") {
    const approved = view.approved;
    return (
      <ConsentShell chip="Device authorization" tone={approved ? "environments" : "warning"}>
        <ConsentMessage
          title={approved ? "Device connected" : "Connection denied"}
          body={
            approved
              ? "Return to your agent. It can finish connecting now."
              : "The device was not given access to your Strap."
          }
        />
      </ConsentShell>
    );
  }

  if (view.kind === "approve") {
    const { allowedModes } = view;
    return (
      <ConsentShell chip="Device authorization" tone="secrets">
        <ConsentMessage
          title={`Connect ${view.clientName}`}
          body="Confirm the app name and choose the single Strap this device may access. Only approve a code you started on your own device."
        />
        <form method="post" action="/device/decision" className="strap-consent-form">
          <input type="hidden" name="request_id" value={view.requestId} />
          <div className="strap-field">
            <label className="strap-field-label" htmlFor="creed_id">Strap</label>
            <select id="creed_id" name="creed_id" className="strap-input strap-select">
              {view.creeds.map((creed) => (
                <option key={creed.id} value={creed.id}>
                  {creed.type === "personal" ? "Personal Strap" : creed.name}
                </option>
              ))}
            </select>
          </div>
          <div className="strap-field">
            <label className="strap-field-label" htmlFor="mode">Maximum access</label>
            <select
              id="mode"
              name="mode"
              defaultValue={allowedModes[allowedModes.length - 1]}
              className="strap-input strap-select"
            >
              {allowedModes.map((mode) => (
                <option key={mode} value={mode}>
                  {MODE_LABELS[mode]}
                </option>
              ))}
            </select>
          </div>
          <p className="strap-consent-meta">All modes can read shared skills. Direct access also permits skill publication for profile owners and Company admins.</p>
          <div className="strap-consent-actions" style={{ marginTop: ".25rem" }}>
            <button type="submit" name="decision" value="deny" className="strap-button strap-button-secondary">
              Deny
            </button>
            <button type="submit" name="decision" value="allow" className="strap-button strap-button-primary">
              Allow
            </button>
          </div>
        </form>
      </ConsentShell>
    );
  }

  return (
    <ConsentShell chip="Device authorization" tone="secrets">
      <ConsentMessage
        title="Connect a headless device"
        body="Enter the eight-character code shown by your agent. Codes expire after ten minutes."
      />
      <form method="post" action="/device/verify" className="strap-consent-form">
        <div className="strap-field">
          <label className="strap-field-label" htmlFor="user_code">Device code</label>
          <input
            id="user_code"
            name="user_code"
            autoComplete="one-time-code"
            maxLength={9}
            placeholder="ABCD-EFGH"
            className="strap-input strap-input-code"
            aria-invalid={view.error ? true : undefined}
            aria-describedby={view.error ? "user_code_error" : undefined}
            required
          />
          {view.error ? (
            <p id="user_code_error" className="strap-field-error" role="alert">
              {view.error === "rate"
                ? "Too many attempts. Wait a minute and try again."
                : "That code is invalid or expired."}
            </p>
          ) : null}
        </div>
        <button type="submit" className="strap-button strap-button-primary strap-button-block">
          Continue
        </button>
      </form>
    </ConsentShell>
  );
}
