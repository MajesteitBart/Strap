import { TwoFactorScreen } from "@/components/auth/two-factor-screen";
import { pageHead } from "@/lib/seo/head";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSignInEntry } from "../../functions/entry";

export const Route = createFileRoute("/login/two-factor")({
  loaderDeps: ({ search }) => ({ next: (search as { next?: string }).next }),
  loader: async ({ deps }) => {
    const entry = await getSignInEntry({ data: { next: deps.next, requireConfigured: true } });
    if (entry.kind === "redirect") throw redirect({ href: entry.to, replace: true });
    return entry;
  },
  gcTime: 0,
  head: () => pageHead({ title: "Two-factor authentication", description: "Confirm your sign-in to Strap." }),
  component: TwoFactorPage,
});

function TwoFactorPage() {
  const { nextPath } = Route.useLoaderData();
  return <TwoFactorScreen nextPath={nextPath} />;
}
