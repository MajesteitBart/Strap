import type { Metadata } from "next";
import { ConnectionsScreen } from "@/components/strap/connections-screen";

export const metadata: Metadata = {
  title: "Connections",
};

export default function ConnectionsPage() {
  return <ConnectionsScreen />;
}
