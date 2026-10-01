import { plugin, type Resolver } from "varlock/plugin-lib";
import { fetchStrapSecret, strapEndpoint, strapReference } from "./client.js";

const { SchemaError, ResolutionError } = plugin.ERRORS;
plugin.name = "strap";

type Instance = { token: Resolver; server?: Resolver };
const instances = new Map<string, Instance>();

plugin.registerDataType({
  name: "strapAccessKey",
  sensitive: true,
  internal: true,
  typeDescription: "Strap API key with explicitly selected Vault items",
});

plugin.registerRootDecorator({
  name: "initStrap",
  description: "Authorize a Strap Vault resolver",
  isFunction: true,
  process(args) {
    const options = args.objArgs;
    if (!options?.token) throw new SchemaError("@initStrap(token=$STRAP_API_KEY) is required.");
    if (options.id && (!options.id.isStatic || typeof options.id.staticValue !== "string")) {
      throw new SchemaError("Strap instance id must be a static string.");
    }
    // A reference keeps the credential out of schema text and error diagnostics.
    if (options.token.isStatic) throw new SchemaError("Pass token through a sensitive config reference, such as $STRAP_API_KEY.");
    const id = String(options.id?.staticValue ?? "default");
    if (instances.has(id)) throw new SchemaError("Duplicate Strap instance id.");
    instances.set(id, { token: options.token, server: options.server });
  },
});

plugin.registerResolverFunction({
  name: "strap",
  label: "Resolve a Strap Vault secret",
  impliesSensitive: true,
  argsSchema: { type: "array", arrayMinLength: 1, arrayMaxLength: 2 },
  process() {
    const args = this.arrArgs ?? [];
    const instanceArg = args.length === 2 ? args[0] : undefined;
    if (instanceArg && (!instanceArg.isStatic || typeof instanceArg.staticValue !== "string")) {
      throw new SchemaError("Strap instance id must be a static string.");
    }
    const instance = instances.get(String(instanceArg?.staticValue ?? "default"));
    if (!instance) throw new SchemaError("Initialize this Strap instance with @initStrap first.");
    const reference = args.at(-1);
    if (!reference) throw new SchemaError("A Strap secret reference is required.");
    if (reference.isStatic) {
      try { strapReference(reference.staticValue); }
      catch { throw new SchemaError("Use a Vault item UUID or secret://UUID reference."); }
    }
    return { instance, reference };
  },
  async resolve({ instance, reference }) {
    // Resolve credential dependencies in Varlock, so their sensitivity propagates.
    const [token, server, value] = await Promise.all([
      instance.token.resolve(), instance.server?.resolve(), reference.resolve(),
    ]);
    try {
      strapEndpoint(server);
      return await fetchStrapSecret({ token, server, reference: value });
    } catch (error) {
      throw new ResolutionError(error instanceof Error ? error.message : "Strap secret resolution failed.");
    }
  },
});
