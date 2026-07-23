import { createServer, type Server } from "node:http";
import { CALLBACK_PATH, CALLBACK_TIMEOUT_MS } from "../constants.js";
import { CliError } from "../errors.js";

export type OAuthCallback = { code: string; state?: string };

export type CallbackServer = {
  redirectUrl: string;
  waitForCallback(): Promise<OAuthCallback>;
  close(): Promise<void>;
};

const successPage = `<!doctype html><html><head><meta charset="utf-8"><title>Strap connected</title></head><body style="font-family:system-ui;background:#fbf6ee;color:#171717;padding:48px"><h1>Strap CLI connected</h1><p>You can close this window and return to your terminal.</p></body></html>`;

export async function createCallbackListener(timeoutMs = CALLBACK_TIMEOUT_MS): Promise<CallbackServer> {
  let resolveCallback: (value: OAuthCallback) => void;
  let rejectCallback: (error: Error) => void;
  const callback = new Promise<OAuthCallback>((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });

  let settled = false;
  const server: Server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    if (requestUrl.pathname !== CALLBACK_PATH) {
      response.writeHead(404).end("Not found");
      return;
    }
    if (settled) {
      response.writeHead(409).end("Authorization callback already handled.");
      return;
    }
    const error = requestUrl.searchParams.get("error");
    const description = requestUrl.searchParams.get("error_description");
    const code = requestUrl.searchParams.get("code");
    const state = requestUrl.searchParams.get("state") ?? undefined;
    settled = true;
    if (error) {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end("Strap authorization was not completed. You can return to the terminal.");
      rejectCallback(new CliError(description || `OAuth authorization failed: ${error}`));
      return;
    }
    if (!code) {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end("Missing authorization code.");
      rejectCallback(new CliError("The OAuth callback did not contain an authorization code."));
      return;
    }
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }).end(successPage);
    resolveCallback({ code, ...(state ? { state } : {}) });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new CliError("Could not start the OAuth callback listener.");

  const timer = setTimeout(() => {
    if (!settled) {
      settled = true;
      rejectCallback(new CliError("OAuth authorization timed out. Run `strap login` to try again."));
    }
  }, timeoutMs);
  timer.unref();

  return {
    redirectUrl: `http://127.0.0.1:${address.port}${CALLBACK_PATH}`,
    waitForCallback: () => callback,
    close: async () => {
      clearTimeout(timer);
      if (!server.listening) return;
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
