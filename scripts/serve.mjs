// Production server for the built app (`npm run build && npm start`).
//
// It serves requests the way Netlify does: a file in dist/client wins (with
// the headers from dist/client/_headers, and /path served from /path.html),
// and everything else goes to the server build's fetch handler. Text
// responses are compressed like a CDN would. CI and local verification use it
// to exercise the real build.
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";
import { brotliCompressSync, constants, createBrotliCompress, createGzip, gzipSync } from "node:zlib";

const root = resolve(import.meta.dirname, "..");
const clientDir = join(root, "dist/client");
const server = (await import(pathToFileURL(join(root, "dist/server/server.js")).href)).default;
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "localhost";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".webmanifest": "application/manifest+json",
};

// Netlify _headers format: a path pattern line, then indented "Name: value" lines.
function readHeaderRules() {
  const file = join(clientDir, "_headers");
  if (!existsSync(file)) return [];
  const rules = [];
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) {
      rules.push({ pattern: line.trim(), headers: [] });
    } else if (rules.length) {
      const index = line.indexOf(":");
      rules.at(-1).headers.push([line.slice(0, index).trim(), line.slice(index + 1).trim()]);
    }
  }
  return rules;
}

const headerRules = readHeaderRules();

function matches(pattern, pathname) {
  if (pattern.endsWith("/*")) return pathname.startsWith(pattern.slice(0, -1));
  return pattern === pathname;
}

function staticFileFor(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const candidates = decoded.endsWith("/") ? [join(decoded, "index.html")] : [decoded, `${decoded}.html`];
  for (const candidate of candidates) {
    const file = normalize(join(clientDir, candidate));
    if (!file.startsWith(clientDir + sep)) continue;
    if (file === join(clientDir, "_headers")) continue;
    if (existsSync(file) && statSync(file).isFile()) return file;
  }
  return null;
}

const COMPRESSIBLE = /^(text\/|application\/(json|javascript|xml|manifest\+json)|image\/svg\+xml)/;

function pickEncoding(request, contentType) {
  if (!contentType || !COMPRESSIBLE.test(contentType)) return null;
  const accepted = request.headers["accept-encoding"] ?? "";
  if (/\bbr\b/.test(accepted)) return "br";
  if (/\bgzip\b/.test(accepted)) return "gzip";
  return null;
}

// Build output never changes while the server runs, so each file is
// compressed once.
const compressedFiles = new Map();
function compressedFile(file, encoding) {
  const key = `${encoding}:${file}`;
  if (!compressedFiles.has(key)) {
    const bytes = readFileSync(file);
    compressedFiles.set(key, encoding === "br"
      ? brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } })
      : gzipSync(bytes, { level: 9 }));
  }
  return compressedFiles.get(key);
}

function sendStatic(request, response, pathname, file) {
  const contentType = MIME[extname(file)] ?? "application/octet-stream";
  response.statusCode = 200;
  response.setHeader("Content-Type", contentType);
  response.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  for (const rule of headerRules) {
    if (matches(rule.pattern, pathname)) for (const [name, value] of rule.headers) response.setHeader(name, value);
  }
  const encoding = pickEncoding(request, contentType);
  if (!encoding) return createReadStream(file).pipe(response);
  response.setHeader("Content-Encoding", encoding);
  response.setHeader("Vary", "Accept-Encoding");
  response.end(request.method === "HEAD" ? undefined : compressedFile(file, encoding));
}

async function sendDynamic(request, response) {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) for (const item of value) headers.append(name, item);
    else if (value !== undefined) headers.set(name, value);
  }
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const webRequest = new Request(url, {
    method: request.method,
    headers,
    body: hasBody ? Readable.toWeb(request) : undefined,
    duplex: hasBody ? "half" : undefined,
  });
  const webResponse = await server.fetch(webRequest, { context: {} });
  response.statusCode = webResponse.status;
  for (const [name, value] of webResponse.headers) {
    if (name === "set-cookie") continue;
    response.setHeader(name, value);
  }
  const cookies = webResponse.headers.getSetCookie();
  if (cookies.length) response.setHeader("Set-Cookie", cookies);
  if (!webResponse.body || request.method === "HEAD") return response.end();
  const encoding = webResponse.headers.has("content-encoding") ? null : pickEncoding(request, webResponse.headers.get("content-type"));
  if (!encoding) return Readable.fromWeb(webResponse.body).pipe(response);
  response.setHeader("Content-Encoding", encoding);
  response.appendHeader("Vary", "Accept-Encoding");
  response.removeHeader("Content-Length");
  // Fast settings and per-chunk flushing keep streamed HTML streaming.
  const compressor = encoding === "br"
    ? createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 4 }, flush: constants.BROTLI_OPERATION_FLUSH })
    : createGzip({ level: 6, flush: constants.Z_SYNC_FLUSH });
  Readable.fromWeb(webResponse.body).pipe(compressor).pipe(response);
}

createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  const file = request.method === "GET" || request.method === "HEAD" ? staticFileFor(pathname) : null;
  if (file) return sendStatic(request, response, pathname, file);
  sendDynamic(request, response).catch((error) => {
    process.stderr.write(`${error?.stack ?? error}\n`);
    if (!response.headersSent) response.statusCode = 500;
    response.end();
  });
}).listen(port, host, () => {
  process.stdout.write(`Strap listening on http://${host}:${port}\n`);
});
