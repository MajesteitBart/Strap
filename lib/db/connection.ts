// Shared by the server client, migration commands, and database tests.
import postgres from "postgres";

export function createConnection(connectionString: string) {
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("DATABASE_URL must be a Postgres connection string.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]", "postgres"].includes(url.hostname);
  // Hosted connections always verify TLS; URL parameters cannot disable it.
  url.searchParams.delete("sslmode");
  url.searchParams.delete("ssl");
  return postgres(url.toString(), {
    max: 1,
    prepare: false,
    ssl: local ? false : { rejectUnauthorized: true },
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  });
}
