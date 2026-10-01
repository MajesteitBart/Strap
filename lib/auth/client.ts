"use client";

import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Sign-in screens handle twoFactorRedirect themselves to keep the next path.
export const authClient = createAuthClient({ plugins: [twoFactorClient()] });
