import { TwoFactorScreen } from "@/components/auth/two-factor-screen";
import { isDatabaseConfigured } from "@/lib/env";
import { getRequestAuth } from "@/lib/request-auth";
import { sanitizeNextPath } from "@/lib/safe-next";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Two-factor authentication",
  description: "Confirm your sign-in to Strap.",
};

export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const nextPath = sanitizeNextPath((await searchParams).next);
  if (!isDatabaseConfigured()) redirect("/login");
  const { user } = await getRequestAuth();
  if (user) redirect(nextPath);
  return <TwoFactorScreen nextPath={nextPath} />;
}
