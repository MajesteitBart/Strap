import { AuthScreen } from "@/components/auth/auth-screen";
import { isDatabaseConfigured } from "@/lib/env";
import { getRequestAuth } from "@/lib/request-auth";
import { sanitizeNextPath } from "@/lib/safe-next";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create your Strap account.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const configured = isDatabaseConfigured();
  const nextPath = sanitizeNextPath((await searchParams).next);

  // Already signed in? Send them on to `next` (or the app) rather than the form.
  if (configured) {
    const {
      data: { user },
    } = await getRequestAuth().then(({ user }) => ({ data: { user } }));
    if (user) {
      redirect(nextPath);
    }
  }

  return <AuthScreen mode="signup" configured={configured} nextPath={nextPath} />;
}
