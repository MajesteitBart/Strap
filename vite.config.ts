import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { realpathSync } from "node:fs";
import { sep } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { isPrerenderPath, PRERENDERED_FILE_PATHS } from "./lib/http/prerender-paths.ts";
import { netlifyFunction, staticHeadersFile } from "./scripts/vite-deploy-plugins.ts";

// Physical project root (symlinks and Windows junctions resolved) with a
// trailing separator, so "@/lib/x" maps to "<root>lib/x". Vite resolves
// modules to physical paths; when the root is a junction path instead, route
// files are not recognised and server handlers leak into the browser build.
const root = realpathSync.native(fileURLToPath(new URL("./", import.meta.url))) + sep;

export default defineConfig(({ mode }) => {
  // Browser bundles only ever see NEXT_PUBLIC_* values, inlined at build time.
  // The prefix predates the Vite port; keeping it means deployments keep their
  // existing environment variables.
  const env = loadEnv(mode, root, "");
  const publicEnv: Record<string, string> = { NODE_ENV: mode === "production" ? "production" : "development" };
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith("NEXT_PUBLIC_")) publicEnv[key] = value;
  }
  const publicDefines = Object.fromEntries(
    Object.entries(publicEnv)
      .filter(([key]) => key !== "NODE_ENV")
      .map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
  );

  return {
    root,
    server: {
      port: 3000,
      host: "localhost",
      allowedHosts: (process.env.STRAP_DEV_ORIGINS ?? "")
        .split(",")
        .map((host) => host.trim())
        .filter(Boolean),
    },
    preview: { port: 3000, host: "localhost" },
    resolve: {
      alias: [
        { find: /^@\//, replacement: root },
        // Modules that hold secrets or database access import "server-only".
        // Start's marker keeps them out of the browser bundle at build time.
        { find: /^server-only$/, replacement: "@tanstack/react-start/server-only" },
      ],
    },
    define: publicDefines,
    environments: {
      client: {
        build: {
          // ANALYZE=true writes source maps so bundle contents can be inspected.
          sourcemap: process.env.ANALYZE === "true",
        },
        define: {
          ...publicDefines,
          // Matches the old Next.js browser runtime: process.env exists and
          // only carries public values.
          "process.env": JSON.stringify(publicEnv),
        },
      },
    },
    plugins: [
      tanstackStart({
        srcDirectory: "src",
        router: {
          routeFileIgnorePattern: "\\.test\\.",
        },
        // Crawler files are listed explicitly; pages are discovered from the
        // route tree and from links on prerendered pages.
        pages: PRERENDERED_FILE_PATHS.map((path) => ({ path })),
        prerender: {
          enabled: true,
          crawlLinks: true,
          failOnError: true,
          // /home.html rather than /home/index.html, so the CDN serves /home
          // without a trailing-slash redirect.
          autoSubfolderIndex: false,
          filter: ({ path }) => isPrerenderPath(path),
        },
      }),
      viteReact(),
      tailwindcss(),
      netlifyFunction(),
      staticHeadersFile(),
    ],
  };
});
