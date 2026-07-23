export const STRAP_FILE_NAME = "strap.md";
export const LEGACY_CREED_FILE_NAME = "creed.md";

export function resolveProfilePath(path?: string | null): string {
  return path?.trim() || STRAP_FILE_NAME;
}

export function getProfilePathCandidates(path?: string | null): string[] {
  const configuredPath = resolveProfilePath(path);
  return configuredPath === STRAP_FILE_NAME
    ? [STRAP_FILE_NAME, LEGACY_CREED_FILE_NAME]
    : [configuredPath];
}

export function canAdoptResolvedProfilePath(
  configuredPath: string | null | undefined,
  resolvedPath: string,
): boolean {
  return getProfilePathCandidates(configuredPath).includes(resolvedPath);
}

export function hasProfilePathConflict(
  configuredPath: string,
  resolvedPath?: string,
): boolean {
  return Boolean(resolvedPath && resolvedPath !== configuredPath);
}
