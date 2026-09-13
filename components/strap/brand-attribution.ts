const FIRST_PARTY_ATTRIBUTION =
  /^(?:strap|creed)$|^.+?['’]s\s+(?:strap|creed)$/i;

export function isStrapFirstPartyAttribution(name: string) {
  const normalized = name.trim();
  return FIRST_PARTY_ATTRIBUTION.test(normalized);
}

export function normalizeStrapAttribution(name: string) {
  return isStrapFirstPartyAttribution(name) ? "Strap" : name;
}
