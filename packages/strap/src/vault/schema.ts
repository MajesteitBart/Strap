// Vault metadata formatting shared by the CLI and the MCP server. Secret values never pass through here.

const INSTANCE_ID = /^[A-Za-z_][A-Za-z0-9_-]{0,63}$/;

export type VaultSchemaEntry = { name: string; reference: string; envName: string };

/**
 * Makes Vault text safe for a terminal. Names and descriptions come from other
 * profile managers, so C0, DEL and C1 controls (escape sequences, OSC, CSI) are
 * replaced with "?" before display. JSON output keeps the exact text.
 */
export function terminalText(text: string): string {
  return text.replace(/[\u0000-\u001f\u007f-\u009f]/g, "?");
}

/** Suggests an environment variable name: "Deployment API" and "deploymentApi" both become DEPLOYMENT_API. */
export function vaultEnvName(name: string): string {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  if (!words) return "SECRET";
  return /^[0-9]/.test(words) ? `_${words}` : words;
}

/** Splits text into lowercase letter-and-digit words in any script, so "share artifact" matches SHARE_ARTIFACT_SERVER and "clé" stays "clé". */
function words(text: string): string[] {
  return text.normalize("NFKC").replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** True when every query word starts a word in the name or description. */
/** Builds a matcher that tokenizes the query once; use it when filtering many items. */
export function vaultQueryMatcher(query: string): (item: { name: string; description: string }) => boolean {
  const wanted = words(query);
  if (wanted.length === 0) return () => true;
  return (item) => {
    const available = [...words(item.name), ...words(item.description)];
    return wanted.every((term) => available.some((word) => word.startsWith(term)));
  };
}

export function matchesVaultQuery(item: { name: string; description: string }, query: string): boolean {
  return vaultQueryMatcher(query)(item);
}

export function isVaultInstanceId(value: string): boolean {
  return INSTANCE_ID.test(value);
}

const ENV_NAME = /^[A-Z_][A-Z0-9_]*$/;

// Variable names come from secret names, which other profile managers may
// choose. Two rules keep a generated schema from running code or redirecting
// traffic on the machine of whoever resolves it:
// 1. Known startup, shell, loader, package-manager, VCS and proxy variables are
//    never generated (isProcessControlEnvName).
// 2. Any other name is only generated as an active line when it ends in a
//    credential-like word; everything else needs a person to review it first
//    (envNameNeedsReview). No list of dangerous names is complete, so the
//    second rule is what bounds the risk.
const PROCESS_CONTROL_NAMES = new Set([
  "STRAP_API_KEY",
  "PATH", "PATHEXT", "COMSPEC", "SHELL", "ENV", "SHELLOPTS", "PS4", "IFS", "PROMPT_COMMAND", "CDPATH",
  "CLASSPATH", "_JAVA_OPTIONS", "JDK_JAVA_OPTIONS",
  "SSH_ASKPASS", "SSH_AUTH_SOCK", "EDITOR", "VISUAL", "PAGER", "BROWSER", "LESSOPEN", "LESSCLOSE", "MANPAGER",
  "SSL_CERT_FILE", "SSL_CERT_DIR", "CURL_CA_BUNDLE", "REQUESTS_CA_BUNDLE",
  "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "FTP_PROXY",
  "GOPROXY", "GOFLAGS", "GONOSUMDB", "GOPRIVATE", "GOSUMDB", "GOINSECURE",
  "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "TMPDIR", "TEMP", "TMP", "XDG_CONFIG_HOME", "XDG_DATA_HOME",
]);
const PROCESS_CONTROL_PREFIXES = [
  "LD_", "DYLD_", "NODE_", "NPM_CONFIG_", "YARN_", "PNPM_", "BUN_", "DENO_", "GIT_", "BASH", "ZSH", "PYTHON", "PIP_", "UV_",
  "PERL", "RUBY", "GEM_", "BUNDLE_", "JAVA_", "MAVEN_", "GRADLE_", "DOTNET_", "COR_", "CORECLR_", "CARGO_", "RUSTC", "RUSTFLAGS",
];
// Last word of a generated name that marks it as an ordinary credential or address.
const CREDENTIAL_SUFFIXES = new Set([
  "KEY", "KEYS", "TOKEN", "TOKENS", "SECRET", "SECRETS", "PASSWORD", "PASS", "PWD", "PASSPHRASE", "CREDENTIALS", "AUTH",
  "URL", "URI", "DSN", "HOST", "SERVER", "ENDPOINT", "USER", "USERNAME", "ID", "ACCOUNT", "SALT", "WEBHOOK",
]);

/** True for variable names that control process startup and are never suggested. */
export function isProcessControlEnvName(name: string): boolean {
  const upper = name.toUpperCase();
  return PROCESS_CONTROL_NAMES.has(upper) || PROCESS_CONTROL_PREFIXES.some((prefix) => upper.startsWith(prefix));
}

/** True when a generated name does not end in a credential-like word and needs a person to review it. */
export function envNameNeedsReview(name: string): boolean {
  const words = name.toUpperCase().split("_").filter(Boolean);
  return words.length < 2 || !CREDENTIAL_SUFFIXES.has(words[words.length - 1]!);
}
const REFERENCE = /^secret:\/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function vaultSchemaLine(entry: Pick<VaultSchemaEntry, "envName" | "reference">, instance?: string): string {
  // Output is appended to .env.schema, so only emit shapes that cannot inject lines.
  if (!ENV_NAME.test(entry.envName) || !REFERENCE.test(entry.reference)) throw new Error("Invalid variable name or secret reference.");
  if (isProcessControlEnvName(entry.envName)) {
    throw new Error(`${entry.envName} controls how programs start or connect, so it is not generated. Rename the secret, or write that line yourself after review.`);
  }
  if (instance !== undefined && !isVaultInstanceId(instance)) throw new Error("Invalid instance id.");
  const call = instance ? `strap(${instance}, "${entry.reference}")` : `strap("${entry.reference}")`;
  return `# @sensitive @required\n${entry.envName}=${call}`;
}

/** Comments every line of free text and drops control characters, so it stays a comment. */
function commentLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/).map((line) => `# ${line.replace(/[\u0000-\u001f\u007f]/g, " ").trimEnd()}`.trimEnd());
}

/** Formats .env.schema lines. Throws when two secrets would share one variable name. */
export function formatVaultSchema(entries: VaultSchemaEntry[], options: { instance?: string; heading?: string } = {}): string {
  if (options.instance !== undefined && !isVaultInstanceId(options.instance)) {
    throw new Error("Instance ids start with a letter or underscore and contain only letters, digits, _ or -.");
  }
  const seen = new Map<string, string>();
  for (const entry of entries) {
    const previous = seen.get(entry.envName);
    if (previous) throw new Error(`"${terminalText(previous)}" and "${terminalText(entry.name)}" would both become ${entry.envName}. Rename one or narrow the selection.`);
    seen.set(entry.envName, entry.name);
  }
  // Names that are not clearly credentials are emitted commented out, so they
  // take effect only after someone reads and uncomments them.
  const lines = entries.map((entry) => {
    const line = vaultSchemaLine(entry, options.instance);
    if (!envNameNeedsReview(entry.envName)) return line;
    return [`# Review ${entry.envName} before enabling: it does not end in KEY, TOKEN, SECRET, URL or a similar word.`, ...line.split("\n").map((part) => `# ${part}`)].join("\n");
  });
  return [...(options.heading ? commentLines(options.heading) : []), ...lines].join("\n") + "\n";
}
