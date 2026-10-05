import { AccountScreen } from "@/components/strap/account-screen";
import { pageHead } from "@/lib/seo/head";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/account")({
  head: () => pageHead({ title: "Account" }),
  component: AccountScreen,
});
