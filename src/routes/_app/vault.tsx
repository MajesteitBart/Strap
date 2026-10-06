import { ApiKeyVaultScreen } from "@/components/strap/api-key-vault-screen";
import { pageHead } from "@/lib/seo/head";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/vault")({
  head: () => pageHead({ title: "Vault" }),
  component: ApiKeyVaultScreen,
});
