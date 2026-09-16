// Hosted imports require the operator to name the exact destination separately
// from its secret connection string. Source credentials never select a target.
export function validateMigrationTarget(sourceUrl: string, targetUrl: string, args: string[]) {
  let apply = false;
  let confirmedTarget: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--apply" && !apply) apply = true;
    else if (args[index] === "--target" && !confirmedTarget && args[index + 1]) confirmedTarget = args[++index];
    else throw new Error("Use --apply and, for hosted imports, --target host:port/database.");
  }
  const source = new URL(sourceUrl);
  const target = new URL(targetUrl);
  const local = ["localhost", "127.0.0.1", "[::1]", "postgres"];
  const sourceHost = local.includes(source.hostname) ? "loopback" : source.hostname;
  const targetHost = local.includes(target.hostname) ? "loopback" : target.hostname;
  if (sourceHost === targetHost && (source.port || "5432") === (target.port || "5432") && source.pathname === target.pathname) {
    throw new Error("Source and destination must differ.");
  }
  const destination = `${target.hostname}:${target.port || "5432"}${target.pathname}`;
  if ((!local.includes(target.hostname) || confirmedTarget) && confirmedTarget !== destination) {
    throw new Error("Hosted import requires --target matching the destination host, port and database.");
  }
  return { apply, destination };
}
