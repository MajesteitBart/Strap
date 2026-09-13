// Explicit local-only Stripe fixture for verify-legacy-deletion.mjs. Load with
// NODE_OPTIONS=--import=<absolute file URL> on a disposable local app server.
const database = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://invalid");
if (database.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(database.hostname) ||
    process.env.STRIPE_SECRET_KEY !== "sk_test_local_fixture") {
  throw new Error("Legacy Stripe fixtures require a local database and the fixture key.");
}
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (url.origin !== "https://api.stripe.com") return realFetch(input, init);
  const id = decodeURIComponent(url.pathname.split("/").at(-1));
  if (id === "sub_verification_unavailable") return Response.json({}, { status: 503 });
  if (!["sub_verification_active", "sub_verification_scheduled", "sub_verification_canceled"].includes(id)) {
    return Response.json({ error: { code: "resource_missing" } }, { status: 404 });
  }
  return Response.json({ id, status: id.endsWith("canceled") ? "canceled" : "active",
    cancel_at_period_end: id.endsWith("scheduled"), items: { data: [{ current_period_end: 1_800_000_000 }] } });
};
