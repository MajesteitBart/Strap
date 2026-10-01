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

/** Splits text into lowercase alphanumeric words so "share artifact" matches SHARE_ARTIFACT_SERVER. */
function words(text: string): string[] {
  return text.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** True when every query word starts a word in the name or description. */
export function matchesVaultQuery(item: { name: string; description: string }, query: string): boolean {
  const wanted = words(query);
  if (wanted.length === 0) return true;
  const available = [...words(item.name), ...words(item.description)];
  return wanted.every((term) => available.some((word) => word.startsWith(term)));
}

export function isVaultInstanceId(value: string): boolean {
  return INSTANCE_ID.test(value);
}

const ENV_NAME = /^[A-Z_][A-Z0-9_]*$/;
const REFERENCE = /^secret:\/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function vaultSchemaLine(entry: Pick<VaultSchemaEntry, "envName" | "reference">, instance?: string): string {
  // Output is appended to .env.schema, so only emit shapes that cannot inject lines.
  if (!ENV_NAME.test(entry.envName) || !REFERENCE.test(entry.reference)) throw new Error("Invalid variable name or secret reference.");
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
