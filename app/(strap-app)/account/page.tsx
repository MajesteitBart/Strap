import type { Metadata } from "next";
import { AccountScreen } from "@/components/strap/account-screen";

export const metadata: Metadata = {
  title: "Account",
};

export default function AccountPage() {
  return <AccountScreen />;
}
