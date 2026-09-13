import type { Metadata } from "next";
import { ApiKeyVaultScreen } from "@/components/strap/api-key-vault-screen";

export const metadata: Metadata = {
  title: "Vault",
};

export default function VaultPage() {
  return <ApiKeyVaultScreen />;
}
