import { AuthScreen } from "@/components/auth/auth-screen";
import { pageHead } from "@/lib/seo/head";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSignInEntry } from "../functions/entry";

// Already signed in? Send them on to `next` (or the app) rather than the form.
export const Route = createFileRoute("/signup")({
  loaderDeps: ({ search }) => ({ next: (search as { next?: string }).next }),
  loader: async ({ deps }) => {
    const entry = await getSignInEntry({ data: { next: deps.next } });
    if (entry.kind === "redirect") throw redirect({ href: entry.to, replace: true });
    return entry;
  },
  gcTime: 0,
  head: () => pageHead({ title: "Create your account", description: "Create your Strap account." }),
  component: SignupPage,
});

function SignupPage() {
  const { configured, nextPath, signUpsOpen } = Route.useLoaderData();
  return <AuthScreen mode="signup" configured={configured} nextPath={nextPath} signUpsOpen={signUpsOpen} />;
}
