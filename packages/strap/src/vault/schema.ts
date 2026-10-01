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

// Variables that change how a runtime, shell, loader or network client starts.
// A secret mapped to one of these could run code or redirect traffic on the
// machine of whoever resolves the schema, which may be a different manager
// than the one who named the secret. They are never generated automatically.
const PROCESS_CONTROL_NAMES = new Set([
  "STRAP_API_KEY",
  "NODE_OPTIONS", "NODE_PATH", "NODE_EXTRA_CA_CERTS", "NODE_TLS_REJECT_UNAUTHORIZED", "NODE_REPL_EXTERNAL_MODULE",
  "PATH", "PATHEXT", "COMSPEC", "SHELL", "BASH_ENV", "ENV", "SHELLOPTS", "BASHOPTS", "PS4", "IFS", "PROMPT_COMMAND",
  "PYTHONPATH", "PYTHONSTARTUP", "PYTHONHOME", "PYTHONINSPECT", "PYTHONUSERBASE",
  "PERL5OPT", "PERL5LIB", "PERLLIB", "RUBYOPT", "RUBYLIB",
  "JAVA_TOOL_OPTIONS", "_JAVA_OPTIONS", "JDK_JAVA_OPTIONS", "CLASSPATH", "DOTNET_STARTUP_HOOKS",
  "GIT_SSH", "GIT_SSH_COMMAND", "GIT_EXEC_PATH", "GIT_ASKPASS", "SSH_ASKPASS", "EDITOR", "VISUAL", "PAGER", "BROWSER",
  "SSL_CERT_FILE", "SSL_CERT_DIR", "CURL_CA_BUNDLE", "REQUESTS_CA_BUNDLE",
  "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY",
  "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "TMPDIR", "TEMP", "TMP",
]);
const PROCESS_CONTROL_PREFIXES = ["LD_", "DYLD_", "NPM_CONFIG_", "GIT_CONFIG", "COR_", "CORECLR_"];

/** True for variable names that control process startup and are never suggested. */
export function isProcessControlEnvName(name: string): boolean {
  const upper = name.toUpperCase();
  return PROCESS_CONTROL_NAMES.has(upper) || PROCESS_CONTROL_PREFIXES.some((prefix) => upper.startsWith(prefix));
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
  const lines = entries.map((entry) => vaultSchemaLine(entry, options.instance));
  return [...(options.heading ? commentLines(options.heading) : []), ...lines].join("\n") + "\n";
}
