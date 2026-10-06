// Build-time deployment output for Netlify.
//
// netlifyFunction writes the one function Netlify runs for everything that is
// not a static file (server routes, server functions and per-request pages).
// staticHeadersFile writes dist/client/_headers, because Netlify applies
// _headers only to static files and never to function responses.
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import { headerPolicyFromEnv, netlifyHeadersFile } from "../lib/http/headers.ts";

const FUNCTIONS_DIR = ".netlify/v1/functions";

export function netlifyFunction(): Plugin {
  let config: ResolvedConfig;
  return {
    name: "strap:netlify-function",
    apply: "build",
    applyToEnvironment: (environment) => environment.name === "ssr",
    configResolved(resolved) {
      config = resolved;
    },
    async writeBundle(_options, bundle) {
      const entries = Object.values(bundle).filter((chunk) => chunk.type === "chunk" && chunk.isEntry);
      if (entries.length !== 1) throw new Error(`Expected one server entry chunk, found ${entries.length}.`);
      const functionsDir = join(config.root, FUNCTIONS_DIR);
      const serverEntry = resolve(config.root, this.environment.config.build.outDir, entries[0].fileName);
      const importPath = relative(functionsDir, serverEntry).split(sep).join("/");
      await mkdir(functionsDir, { recursive: true });
      await writeFile(
        join(functionsDir, "server.mjs"),
        [
          `import server from "${importPath}";`,
          "",
          "// Netlify passes its context as the second argument. waitUntil keeps",
          "// post-response work (auth emails) alive after the response is sent.",
          "export default (request, context) =>",
          "  server.fetch(request, { context: { waitUntil: context?.waitUntil?.bind(context) } });",
          "",
          "export const config = {",
          '  name: "Strap server",',
          '  path: "/*",',
          "  preferStatic: true,",
          "};",
          "",
        ].join("\n"),
      );
    },
  };
}

export function staticHeadersFile(): Plugin {
  let config: ResolvedConfig;
  return {
    name: "strap:static-headers",
    apply: "build",
    applyToEnvironment: (environment) => environment.name === "client",
    configResolved(resolved) {
      config = resolved;
    },
    async writeBundle() {
      const outDir = resolve(config.root, this.environment.config.build.outDir);
      await writeFile(join(outDir, "_headers"), netlifyHeadersFile(headerPolicyFromEnv({ ...process.env, NODE_ENV: "production" })));
    },
  };
}
