import { ResetPasswordScreen } from "@/components/auth/reset-password-screen";
import { isDatabaseConfigured } from "@/lib/env";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your Strap account.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordScreen configured={isDatabaseConfigured()} />;
}
