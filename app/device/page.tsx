import Link from "next/link";
import { ConsentMessage, ConsentShell } from "@/components/strap/consent-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDeviceApproval } from "@/lib/oauth-device";
import { deviceGrantModesForScope } from "@/lib/oauth-device-shared";

export const dynamic = "force-dynamic";

type Params = { request?: string; result?: string; error?: string };

export default async function DevicePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
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

  if (params.result) {
    const approved = params.result === "approved";
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

  const approval = params.request
    ? await getDeviceApproval({ requestId: params.request, userId: user.id })
    : null;

  if (approval) {
    const allowedModes = deviceGrantModesForScope(approval.request.scope);
    const modeLabels = {
      "read-only": "Read only",
      "proposal-only": "Read and propose",
      direct: "Allow permitted direct edits",
    } as const;
    return (
      <ConsentShell chip="Device authorization" tone="secrets">
        <ConsentMessage
          title={`Connect ${approval.client.clientName}`}
          body="Confirm the app name and choose the single Strap this device may access. Only approve a code you started on your own device."
        />
        <form method="post" action="/device/decision" className="strap-consent-form">
          <input type="hidden" name="request_id" value={approval.request.id} />
          <div className="strap-field">
            <label className="strap-field-label" htmlFor="creed_id">Strap</label>
            <select id="creed_id" name="creed_id" className="strap-input strap-select">
              {approval.creeds.map((creed) => (
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
                  {modeLabels[mode]}
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
            aria-invalid={params.error ? true : undefined}
            aria-describedby={params.error ? "user_code_error" : undefined}
            required
          />
          {params.error ? (
            <p id="user_code_error" className="strap-field-error" role="alert">
              {params.error === "rate"
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
