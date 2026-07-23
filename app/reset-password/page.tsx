import type { Metadata } from "next";
import { ResetPasswordScreen } from "@/components/auth/reset-password-screen";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Reset password | Strap",
  description: "Choose a new password for your Strap account.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordScreen configured={isSupabaseConfigured()} />;
}
