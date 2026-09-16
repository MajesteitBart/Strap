import { AuthScreen } from "@/components/auth/auth-screen";
import { isDatabaseConfigured } from "@/lib/env";
import { getRequestAuth } from "@/lib/request-auth";
import { sanitizeNextPath } from "@/lib/safe-next";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Strap.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const configured = isDatabaseConfigured();
  const nextPath = sanitizeNextPath((await searchParams).next);

  // Already signed in? Don't show the login form (which would let them loop
  // through OAuth pointlessly) - send them on to `next` (or the app).
  if (configured) {
    const {
      data: { user },
    } = await getRequestAuth().then(({ user }) => ({ data: { user } }));
    if (user) {
      redirect(nextPath);
    }
  }

  return <AuthScreen mode="login" configured={configured} nextPath={nextPath} />;
}
