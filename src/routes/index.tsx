import { BackendSetupScreen } from "@/components/auth/backend-setup-screen";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getRootEntry } from "../functions/entry";

// `/` only routes: signed-out visitors to /home (the canonical landing page),
// onboarded users to /file, everyone else to onboarding. The redirect is a
// server-side 307 on a fresh request.
export const Route = createFileRoute("/")({
  loader: async () => {
    const entry = await getRootEntry();
    if (entry.kind === "redirect") throw redirect({ href: entry.to, replace: true });
    return entry;
  },
  gcTime: 0,
  component: RootEntry,
});

function RootEntry() {
  const entry = Route.useLoaderData();
  return <BackendSetupScreen errorMessage={entry.message} />;
}
