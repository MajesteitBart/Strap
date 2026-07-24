import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createCallbackListener } from "../src/auth/callback-server.js";
import { StrapOAuthProvider } from "../src/auth/oauth-provider.js";
import { revokeTokens } from "../src/auth/revoke.js";
import { loadCredential } from "../src/config/store.js";
import { assertValidOAuthState } from "../src/mcp/client.js";

async function listen(server: ReturnType<typeof createServer>): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}`;
}

test("accepts one OAuth callback and returns code plus state", async () => {
  const callback = await createCallbackListener(2_000);
  try {
    const callbackUrl = new URL(callback.redirectUrl);
    callbackUrl.searchParams.set("code", "authorization-code");
    callbackUrl.searchParams.set("state", "expected-state");
    const resultPromise = callback.waitForCallback();
    const response = await fetch(callbackUrl);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await resultPromise, {
      code: "authorization-code",
      state: "expected-state",
    });
  } finally {
    await callback.close();
  }
});

test("rejects OAuth callback errors and mismatched state", async () => {
  const callback = await createCallbackListener(2_000);
  try {
    const callbackUrl = new URL(callback.redirectUrl);
    callbackUrl.searchParams.set("error", "access_denied");
    callbackUrl.searchParams.set("error_description", "Authorization denied");
    const rejection = assert.rejects(
      callback.waitForCallback(),
      /Authorization denied/,
    );
    const response = await fetch(callbackUrl);

    assert.equal(response.status, 400);
    await rejection;
    assert.throws(
      () => assertValidOAuthState("wrong-state", "expected-state"),
      /OAuth state validation failed/,
    );
    assert.throws(
      () => assertValidOAuthState(undefined, "expected-state"),
      /OAuth state validation failed/,
    );
    assert.doesNotThrow(
      () => assertValidOAuthState("expected-state", "expected-state"),
    );
  } finally {
    await callback.close();
  }
});

test("persists and invalidates OAuth provider credentials per server", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "strap-auth-test-"));
  const previousDirectory = process.env.STRAP_CONFIG_DIR;
  process.env.STRAP_CONFIG_DIR = directory;
  context.after(async () => {
    if (previousDirectory === undefined) delete process.env.STRAP_CONFIG_DIR;
    else process.env.STRAP_CONFIG_DIR = previousDirectory;
    await rm(directory, { recursive: true, force: true });
  });

  const serverUrl = "https://strap.bvdm.ai/mcp";
  const provider = new StrapOAuthProvider(
    serverUrl,
    "http://127.0.0.1:43210/oauth/callback",
    true,
  );
  await provider.load();
  const state = await provider.state();
  await provider.saveCodeVerifier("verifier-secret");
  await provider.saveClientInformation({
    client_id: "client-id",
    redirect_uris: [provider.redirectUrl],
  });
  await provider.saveTokens({
    access_token: "access-secret",
    refresh_token: "refresh-secret",
    token_type: "bearer",
  });

  assert.equal(provider.expectedState(), state);
  assert.equal(provider.codeVerifier(), "verifier-secret");
  assert.equal(provider.clientInformation()?.client_id, "client-id");
  assert.equal(provider.tokens()?.refresh_token, "refresh-secret");

  await provider.invalidateCredentials("tokens");
  assert.equal(provider.tokens(), undefined);
  assert.equal(
    (await loadCredential(serverUrl)).clientInformation?.client_id,
    "client-id",
  );

  await provider.invalidateCredentials("all");
  assert.deepEqual(await loadCredential(serverUrl), {});
});

test("revokes refresh credentials only through the request body", async (context) => {
  let revocationUrl = "";
  let authorizationHeader: string | undefined;
  let revocationBody = "";
  const server = createServer(async (request, response) => {
    if (request.url === "/.well-known/oauth-authorization-server") {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ revocation_endpoint: `${origin}/revoke` }));
      return;
    }
    revocationUrl = request.url ?? "";
    authorizationHeader = request.headers.authorization;
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    revocationBody = Buffer.concat(chunks).toString("utf8");
    response.writeHead(200).end();
  });
  const origin = await listen(server);
  context.after(() => server.close());

  const revoked = await revokeTokens(
    `${origin}/mcp`,
    {
      access_token: "access-secret",
      refresh_token: "refresh-secret",
      token_type: "bearer",
    },
    {
      client_id: "client-id",
      redirect_uris: ["http://127.0.0.1/oauth/callback"],
    },
  );

  assert.equal(revoked, true);
  assert.equal(revocationUrl, "/revoke");
  assert.equal(authorizationHeader, undefined);
  assert.equal(revocationUrl.includes("refresh-secret"), false);
  assert.equal(new URLSearchParams(revocationBody).get("token"), "refresh-secret");
  assert.equal(
    new URLSearchParams(revocationBody).get("token_type_hint"),
    "refresh_token",
  );
});

test("returns false when remote revocation is unavailable", async (context) => {
  const server = createServer((_request, response) => {
    response.writeHead(503).end();
  });
  const origin = await listen(server);
  context.after(() => server.close());

  assert.equal(
    await revokeTokens(
      `${origin}/mcp`,
      {
        access_token: "access-secret",
        refresh_token: "refresh-secret",
        token_type: "bearer",
      },
      {
        client_id: "client-id",
        redirect_uris: ["http://127.0.0.1/oauth/callback"],
      },
    ),
    false,
  );
});
