/// <reference types="vite/client" />
import { ThemeProvider } from "@/components/strap/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { getAppVersion } from "@/lib/app-version";
import { isDatabaseConfigured } from "@/lib/env";
import { ROOT_LINKS, rootMeta } from "@/lib/seo/head";
import bricolageLatin from "@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2?url";
import interLatin from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import jetbrainsLatin from "@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { lazy, Suspense, type ReactNode } from "react";
import globalsCss from "../styles/globals.css?url";

// The preview shortcuts (welcome tour, checklist, version toast) only exist in
// development, so production bundles never include them.
const WelcomeDevPreview = import.meta.env.DEV
  ? lazy(() => import("@/components/strap/welcome-dev-preview").then((module) => ({ default: module.WelcomeDevPreview })))
  : () => null;

// Deployment facts the UI needs while rendering. Read once on the server (at
// build time for prerendered pages) and reused for the whole session.
const getDeploymentInfo = createServerFn({ method: "GET" }).handler(() => ({
  configured: isDatabaseConfigured(),
  appVersion: getAppVersion(),
}));

const fontPreloads = [interLatin, jetbrainsLatin, bricolageLatin].map((href) => ({
  rel: "preload",
  href,
  as: "font",
  type: "font/woff2",
  crossOrigin: "anonymous" as const,
}));

export const Route = createRootRoute({
  loader: () => getDeploymentInfo(),
  staleTime: Infinity,
  head: () => ({ meta: rootMeta() }),
  shellComponent: RootDocument,
  component: Outlet,
});

// Apply the persisted theme before first paint so dark mode doesn't flash.
const THEME_BOOTSTRAP = `try{var t=localStorage.getItem('creed:theme');if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}}catch(e){}`;

// Links that never change between pages are rendered once with the document,
// outside HeadContent, so client navigations don't re-insert them (a re-inserted
// icon link makes the browser fetch the favicon again).
const STATIC_LINKS = [{ rel: "stylesheet", href: globalsCss }, ...fontPreloads, ...ROOT_LINKS];

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        {STATIC_LINKS.map((link) => (
          <link key={`${link.rel}:${link.href}`} {...link} />
        ))}
        <HeadContent />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <Toaster />
          <Suspense fallback={null}>
            <WelcomeDevPreview />
          </Suspense>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
