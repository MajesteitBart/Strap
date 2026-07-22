import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreedWordmark } from "@/components/creed/brand";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDeviceApproval } from "@/lib/oauth-device";

export const dynamic = "force-dynamic";

type Params = { request?: string; result?: string; error?: string };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--creed-background)] px-6 py-16 text-[var(--creed-text-primary)]">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col items-center justify-center">
        <CreedWordmark className="mb-10 h-5" />
        <section className="w-full rounded-[var(--radius-xl)] bg-[var(--creed-surface)] p-7">
          {children}
        </section>
      </div>
    </main>
  );
}

export default async function DevicePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Shell>
        <h1 className="text-lg font-medium">Sign in to connect a device</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--creed-text-secondary)]">
          Sign in first, then enter the code shown by your headless agent.
        </p>
        <Button asChild className="mt-6 w-full"><Link href="/login?next=/device">Sign in</Link></Button>
      </Shell>
    );
  }

  if (params.result) {
    return (
      <Shell>
        <h1 className="text-lg font-medium">{params.result === "approved" ? "Device connected" : "Connection denied"}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--creed-text-secondary)]">
          {params.result === "approved" ? "Return to your agent. It can finish connecting now." : "The device was not given access to your Creed."}
        </p>
      </Shell>
    );
  }

  const approval = params.request
    ? await getDeviceApproval({ requestId: params.request, userId: user.id })
    : null;

  if (approval) {
    return (
      <Shell>
        <h1 className="text-lg font-medium">Connect {approval.client.clientName}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--creed-text-secondary)]">
          Confirm the app name and choose the single Creed this device may access. Only approve a code you started on your own device.
        </p>
        <form method="post" action="/device/decision" className="mt-6 space-y-4">
          <input type="hidden" name="request_id" value={approval.request.id} />
          <label className="block text-sm font-medium" htmlFor="creed_id">Creed</label>
          <select id="creed_id" name="creed_id" className="h-10 w-full rounded-md border border-[var(--creed-border)] bg-transparent px-3 text-sm">
            {approval.creeds.map((creed) => <option key={creed.id} value={creed.id}>{creed.type === "personal" ? "Personal" : creed.name}</option>)}
          </select>
          <label className="block text-sm font-medium" htmlFor="mode">Maximum access</label>
          <select id="mode" name="mode" defaultValue="proposal-only" className="h-10 w-full rounded-md border border-[var(--creed-border)] bg-transparent px-3 text-sm">
            <option value="read-only">Read only</option>
            <option value="proposal-only">Read and propose</option>
            <option value="direct">Allow permitted direct edits</option>
          </select>
          <div className="flex gap-3 pt-2">
            <Button type="submit" name="decision" value="deny" variant="secondary" className="flex-1">Deny</Button>
            <Button type="submit" name="decision" value="allow" className="flex-1">Allow</Button>
          </div>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-lg font-medium">Connect a headless device</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--creed-text-secondary)]">
        Enter the eight-character code shown by your agent. Codes expire after ten minutes.
      </p>
      {params.error ? <p className="mt-4 text-sm text-[var(--creed-danger)]">{params.error === "rate" ? "Too many attempts. Wait a minute and try again." : "That code is invalid or expired."}</p> : null}
      <form method="post" action="/device/verify" className="mt-6">
        <label className="sr-only" htmlFor="user_code">Device code</label>
        <input id="user_code" name="user_code" autoComplete="one-time-code" maxLength={9} placeholder="ABCD-EFGH" className="h-12 w-full rounded-md border border-[var(--creed-border)] bg-transparent px-4 text-center font-mono text-lg uppercase tracking-[0.15em]" required />
        <Button type="submit" className="mt-4 w-full">Continue</Button>
      </form>
    </Shell>
  );
}
