import { ResetPasswordScreen } from "@/components/auth/reset-password-screen";
import { useDeploymentInfo } from "@/components/deployment-info";
import { pageHead } from "@/lib/seo/head";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/reset-password")({
  head: () => pageHead({ title: "Reset password", description: "Choose a new password for your Strap account." }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { configured } = useDeploymentInfo();
  return <ResetPasswordScreen configured={configured} />;
}
