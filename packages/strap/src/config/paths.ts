import { homedir } from "node:os";
import { join } from "node:path";

export function configDirectory(env: NodeJS.ProcessEnv = process.env): string {
  if (env.STRAP_CONFIG_DIR) return env.STRAP_CONFIG_DIR;
  if (process.platform === "win32" && env.APPDATA) return join(env.APPDATA, "Strap");
  return join(env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "strap");
}

export function credentialsPath(env: NodeJS.ProcessEnv = process.env): string {
  return join(configDirectory(env), "credentials.json");
}

export function settingsPath(env: NodeJS.ProcessEnv = process.env): string {
  return join(configDirectory(env), "config.json");
}
