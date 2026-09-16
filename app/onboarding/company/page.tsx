import { CompanyOnboardingScreen } from "@/components/strap/company-onboarding-screen";
import * as tables from "@/db/schema/application";
import { query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import { isDatabaseConfigured } from "@/lib/env";
import { getRequestAuth } from "@/lib/request-auth";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

// Company onboarding. The owner lands here after buying Company (payment/success
// routes here when the Strap still has onboarding_stage set). Gated: signed-in
// owner of a company Strap that is still being set up.
export const dynamic = "force-dynamic";

export default async function CompanyOnboardingPage() {
  if (!isDatabaseConfigured()) redirect("/pricing");
  const {
    data: { user },
  } = await getRequestAuth().then(({ user }) => ({ data: { user } }));
  if (!user) redirect("/login?next=/onboarding/company");

  // Find a company Strap this user owns that is still in onboarding.
  const admin = serviceContext("app/onboarding/company/page.tsx");
  const { data: owned } = (await query(admin, tables.creeds, "select", (database, scope) => database.select({ id: tables.creeds.id, onboarding_stage: tables.creeds.onboarding_stage }).from(tables.creeds).where(and(scope, eq(tables.creeds.owner_user_id, user.id), eq(tables.creeds.type, "company"))))) as { data: Array<{ id: string; onboarding_stage: string | null }> | null };

  const pending = (owned ?? []).find((c) => c.onboarding_stage != null);
  if (!pending) {
    // Nothing to set up (already done, or not an owner). Go to the app.
    redirect("/file");
  }

  return <CompanyOnboardingScreen creedId={pending.id} />;
}
