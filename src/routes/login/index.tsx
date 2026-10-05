import { AuthScreen } from "@/components/auth/auth-screen";
import { pageHead } from "@/lib/seo/head";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSignInEntry } from "../../functions/entry";

// Already signed in? Don't show the login form (which would let them loop
// through OAuth pointlessly) - send them on to `next` (or the app).
export const Route = createFileRoute("/login/")({
  loaderDeps: ({ search }) => ({ next: (search as { next?: string }).next }),
  loader: async ({ deps }) => {
    const entry = await getSignInEntry({ data: { next: deps.next } });
    if (entry.kind === "redirect") throw redirect({ href: entry.to, replace: true });
    return entry;
  },
  gcTime: 0,
  head: () => pageHead({ title: "Sign in", description: "Sign in to your Strap." }),
  component: LoginPage,
});

function LoginPage() {
  const { configured, nextPath } = Route.useLoaderData();
  return <AuthScreen mode="login" configured={configured} nextPath={nextPath} />;
}
