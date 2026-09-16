import { sendEmail } from "@/lib/email";
import { renderAuthEmail } from "@/lib/email-templates/auth";
import { log } from "@/lib/observability";
import { nextCookies } from "better-auth/next-js";
import { after } from "next/server";
import "server-only";
import { getDatabase } from "../db/client.ts";
import { createAuth } from "./create-auth.ts";

function initializeAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  const baseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const send = async (kind: "confirmation" | "reset", email: string, url: string) => {
    // Next keeps this task alive after the response on the hosting runtime.
    after(async () => {
      const result = await sendEmail({
        to: email,
        subject: kind === "confirmation" ? "Confirm your email" : "Reset your password",
        html: renderAuthEmail(kind, url, baseURL),
      });
      if (!result.ok) log.warn("auth_email_delivery_failed", { kind });
    });
  };
  return createAuth(getDatabase(), {
    baseURL,
    secret,
    sendVerificationEmail: ({ user, url }) => send("confirmation", user.email, url),
    sendResetPassword: ({ user, url }) => send("reset", user.email, url),
    socialProviders: {
      ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
        google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET },
      } : {}),
      ...(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET ? {
        twitter: { clientId: process.env.X_CLIENT_ID, clientSecret: process.env.X_CLIENT_SECRET },
      } : {}),
    },
    plugins: [nextCookies()],
    logger: {
      level: "warn",
      log(level) {
        // Auth/SQL error arguments can include password hashes, tokens or PII.
        if (level === "error") log.error("auth_request_failed");
        else log.warn("auth_request_warning");
      },
    },
  });
}

let auth: ReturnType<typeof initializeAuth> | undefined;
export function getAuthServer() {
  return auth ??= initializeAuth();
}
