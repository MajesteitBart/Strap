import { SettingsScreen } from "@/components/strap/settings-screen";
import { pageHead } from "@/lib/seo/head";
import { createFileRoute } from "@tanstack/react-router";
import SettingsLoading from "./-settings-loading";

export const Route = createFileRoute("/_app/settings")({
  head: () => pageHead({ title: "Settings" }),
  component: SettingsScreen,
  // Shown only when this page's code is slow to arrive.
  pendingComponent: SettingsLoading,
});
