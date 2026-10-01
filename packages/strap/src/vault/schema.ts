// Vault metadata formatting shared by the CLI and the MCP server. Secret values never pass through here.

const INSTANCE_ID = /^[A-Za-z_][A-Za-z0-9_-]{0,63}$/;

export type VaultSchemaEntry = { name: string; reference: string; envName: string };

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

export function vaultSchemaLine(entry: Pick<VaultSchemaEntry, "envName" | "reference">, instance?: string): string {
  const call = instance ? `strap(${instance}, "${entry.reference}")` : `strap("${entry.reference}")`;
  return `# @sensitive @required\n${entry.envName}=${call}`;
}

/** Formats .env.schema lines. Throws when two secrets would share one variable name. */
export function formatVaultSchema(entries: VaultSchemaEntry[], options: { instance?: string; heading?: string } = {}): string {
  if (options.instance !== undefined && !isVaultInstanceId(options.instance)) {
    throw new Error("Instance ids start with a letter or underscore and contain only letters, digits, _ or -.");
  }
  const seen = new Map<string, string>();
  for (const entry of entries) {
    const previous = seen.get(entry.envName);
    if (previous) throw new Error(`"${previous}" and "${entry.name}" would both become ${entry.envName}. Rename one or narrow the selection.`);
    seen.set(entry.envName, entry.name);
  }
  const lines = entries.map((entry) => vaultSchemaLine(entry, options.instance));
  return [...(options.heading ? [`# ${options.heading}`] : []), ...lines].join("\n") + "\n";
}
