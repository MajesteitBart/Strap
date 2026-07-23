import type { OAuthClientInformationMixed, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";

type OAuthMetadata = { revocation_endpoint?: string };
const REVOCATION_TIMEOUT_MS = 10_000;

export async function revokeTokens(
  serverUrl: string,
  tokens: OAuthTokens | undefined,
  client: OAuthClientInformationMixed | undefined,
): Promise<boolean> {
  if (!tokens?.refresh_token || !client?.client_id) return false;
  const origin = new URL(serverUrl).origin;
  const metadataResponse = await fetch(`${origin}/.well-known/oauth-authorization-server`, {
    signal: AbortSignal.timeout(REVOCATION_TIMEOUT_MS),
  });
  if (!metadataResponse.ok) return false;
  const metadata = await metadataResponse.json() as OAuthMetadata;
  if (!metadata.revocation_endpoint) return false;
  const response = await fetch(metadata.revocation_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal: AbortSignal.timeout(REVOCATION_TIMEOUT_MS),
    body: new URLSearchParams({
      token: tokens.refresh_token,
      token_type_hint: "refresh_token",
      client_id: client.client_id,
    }),
  });
  return response.ok;
}
