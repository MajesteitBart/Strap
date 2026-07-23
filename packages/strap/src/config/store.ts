import { chmod, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { credentialsPath, settingsPath } from "./paths.js";

export type StoredCredential = {
  clientInformation?: Record<string, unknown>;
  tokens?: Record<string, unknown>;
  codeVerifier?: string;
  oauthState?: string;
};

type CredentialFile = {
  version: 1;
  servers: Record<string, StoredCredential>;
};

type SettingsFile = {
  version: 1;
  server?: string;
};

const EMPTY_CREDENTIALS: CredentialFile = { version: 1, servers: {} };

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeSecureJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  if (process.platform !== "win32") await chmod(dirname(path), 0o700);
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, path);
  if (process.platform !== "win32") await chmod(path, 0o600);
}

export async function assertCredentialPermissions(): Promise<void> {
  if (process.platform === "win32") return;
  try {
    const details = await stat(credentialsPath());
    if ((details.mode & 0o077) !== 0) await chmod(credentialsPath(), 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export function normalizeServerKey(serverUrl: string): string {
  const url = new URL(serverUrl);
  url.hash = "";
  url.search = "";
  return url.toString().replace(/\/$/, "");
}

export async function loadCredential(serverUrl: string): Promise<StoredCredential> {
  await assertCredentialPermissions();
  const file = await readJson(credentialsPath(), EMPTY_CREDENTIALS);
  return file.servers[normalizeServerKey(serverUrl)] ?? {};
}

export async function saveCredential(serverUrl: string, credential: StoredCredential): Promise<void> {
  const file = await readJson(credentialsPath(), EMPTY_CREDENTIALS);
  file.servers[normalizeServerKey(serverUrl)] = credential;
  await writeSecureJson(credentialsPath(), file);
}

export async function removeCredential(serverUrl: string): Promise<void> {
  const path = credentialsPath();
  const file = await readJson(path, EMPTY_CREDENTIALS);
  delete file.servers[normalizeServerKey(serverUrl)];
  if (Object.keys(file.servers).length === 0) {
    await rm(path, { force: true });
    return;
  }
  await writeSecureJson(path, file);
}

export async function loadSavedServer(): Promise<string | undefined> {
  return (await readJson<SettingsFile>(settingsPath(), { version: 1 })).server;
}

export async function saveServer(server: string): Promise<void> {
  await writeSecureJson(settingsPath(), { version: 1, server } satisfies SettingsFile);
}
