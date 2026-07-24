import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono, Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/strap/theme-provider";
import { WelcomeDevPreview } from "@/components/strap/welcome-dev-preview";
import { BRAND_DESCRIPTION, BRAND_META_TITLE, BRAND_NAME } from "@/lib/marketing/brand";
import { getSiteUrl } from "@/lib/supabase/env";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const strapDisplay = Bricolage_Grotesque({
  variable: "--font-strap-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const strapSans = Inter({
  variable: "--font-strap-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const strapMono = JetBrains_Mono({
  variable: "--font-strap-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Share-card and search-result imagery use the dynamic Strap `/api/og` route.
// The browser icon is the canonical local Strap SVG under `icons.icon`.
// `title.default` is the brand title used by any page that doesn't set its
// own (the root redirect and /home both fall back to it). `title.template`
// suffixes per-page titles, so individual pages set a bare title ("Pricing")
// and get "Pricing | Strap" automatically. A page that wants an exact title
// uses `title: { absolute: "..." }`.
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: BRAND_META_TITLE,
    template: `%s | ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  icons: {
    icon: "/assets/brand/logo.svg",
    shortcut: "/assets/brand/logo.svg",
    apple: "/assets/brand/strap-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    title: BRAND_META_TITLE,
    description: BRAND_DESCRIPTION,
    images: [{ url: "/api/og", width: 1200, height: 630, alt: BRAND_META_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_META_TITLE,
    description: BRAND_DESCRIPTION,
    images: ["/api/og"],
  },
};

// The root layout is intentionally static: it holds no user state, reads no
// cookies/headers, and renders no StrapProvider. That is what lets marketing
// pages prerender as a static shell so <Link> fully prefetches them and
// navigation is instant with no server round-trip. The user-specific work
// (Supabase session, loadStrapState, StrapProvider) lives in <AuthedProviders>,
// pulled in only by the layouts that need it (the app shell and onboarding).
export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${strapDisplay.variable} ${strapSans.variable} ${strapMono.variable} h-full antialiased`}
    >
      <head>
        {/* Apply persisted theme before paint so dark mode doesn't flash.
            This is a server-rendered inline script - runs once during the
            initial HTML response, before React hydrates, so the dark-mode
            class is on <html> by the time anything else paints.
            `next/script` with strategy="beforeInteractive" was causing the
            page to hang in Next 16 dev. Inline <script> in <head> is the
            canonical no-flash pattern and works without ceremony. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('creed:theme');if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <Toaster />
          <WelcomeDevPreview />
        </ThemeProvider>
      </body>
    </html>
  );
}
