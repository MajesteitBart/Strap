import open from "open";
import type { OAuthClientInformationMixed, OAuthClientMetadata, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { CLI_NAME } from "../constants.js";
import { CliError } from "../errors.js";
import { loadCredential, removeCredential, saveCredential, type StoredCredential } from "../config/store.js";

export class StrapOAuthProvider implements OAuthClientProvider {
  private credential: StoredCredential = {};

  constructor(
    private readonly serverUrl: string,
    readonly redirectUrl: string,
    private readonly quiet: boolean,
  ) {}

  async load(): Promise<void> {
    this.credential = await loadCredential(this.serverUrl);
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: CLI_NAME,
      redirect_uris: [this.redirectUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    };
  }

  async state(): Promise<string> {
    const state = crypto.randomUUID();
    this.credential.oauthState = state;
    await this.persist();
    return state;
  }

  clientInformation(): OAuthClientInformationMixed | undefined {
    return this.credential.clientInformation as OAuthClientInformationMixed | undefined;
  }

  async saveClientInformation(clientInformation: OAuthClientInformationMixed): Promise<void> {
    this.credential.clientInformation = clientInformation as unknown as Record<string, unknown>;
    await this.persist();
  }

  tokens(): OAuthTokens | undefined {
    return this.credential.tokens as OAuthTokens | undefined;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    this.credential.tokens = tokens as unknown as Record<string, unknown>;
    await this.persist();
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    if (!this.quiet) process.stderr.write(`Authorize Strap CLI in your browser:\n${authorizationUrl.toString()}\n`);
    try {
      await open(authorizationUrl.toString(), { wait: false });
    } catch {
      if (!this.quiet) process.stderr.write("The browser could not be opened automatically. Open the URL above manually.\n");
    }
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    this.credential.codeVerifier = codeVerifier;
    await this.persist();
  }

  codeVerifier(): string {
    if (!this.credential.codeVerifier) throw new CliError("The OAuth code verifier is missing. Start login again.");
    return this.credential.codeVerifier;
  }

  expectedState(): string | undefined {
    return this.credential.oauthState;
  }

  async invalidateCredentials(scope: "all" | "client" | "tokens" | "verifier" | "discovery"): Promise<void> {
    if (scope === "all") {
      this.credential = {};
      await removeCredential(this.serverUrl);
      return;
    }
    if (scope === "client") delete this.credential.clientInformation;
    if (scope === "tokens") delete this.credential.tokens;
    if (scope === "verifier") delete this.credential.codeVerifier;
    await this.persist();
  }

  async clear(): Promise<void> {
    this.credential = {};
    await removeCredential(this.serverUrl);
  }

  private async persist(): Promise<void> {
    await saveCredential(this.serverUrl, this.credential);
  }
}
