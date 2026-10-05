import { ConnectionsScreen } from "@/components/strap/connections-screen";
import { pageHead } from "@/lib/seo/head";
import { createFileRoute } from "@tanstack/react-router";
import ConnectionsLoading from "./-connections-loading";

export const Route = createFileRoute("/_app/connections")({
  head: () => pageHead({ title: "Connections" }),
  component: ConnectionsScreen,
  // Shown only when this page's code is slow to arrive.
  pendingComponent: ConnectionsLoading,
});
