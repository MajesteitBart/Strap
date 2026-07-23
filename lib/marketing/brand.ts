import { LEGACY_CREED_FILE_NAME, STRAP_FILE_NAME } from "../profile-file.ts";

// Canonical public identity. Keep product copy, metadata, portable filenames,
// and deployment-facing links on these constants so the Strap rebrand cannot
// drift between surfaces. Stable internal Creed identifiers remain unchanged
// for compatibility and should not be derived from these values.
export const BRAND_NAME = "Strap";
export const BRAND_LEGACY_NAME = "Creed";
export const BRAND_TAGLINE = "Bootstrap your agents with context, skills, and keys.";
export const BRAND_DESCRIPTION =
  "Strap gives agents the context, skills, and keys they need to get to work.";
export const BRAND_META_TITLE = `${BRAND_NAME} - ${BRAND_TAGLINE}`;
export const BRAND_SITE_URL = "https://strap.bvdm.ai";
export const BRAND_LEGACY_SITE_URL = "https://creed.md";
export const BRAND_FILE_NAME = STRAP_FILE_NAME;
export const BRAND_LEGACY_FILE_NAME = LEGACY_CREED_FILE_NAME;
export const BRAND_CLI_PACKAGE = "@bvdm/strap";
export const BRAND_CLI_COMMAND = "strap";

// Transitional aliases keep existing imports stable while callers move to the
// neutral BRAND_* names. They intentionally resolve to Strap customer copy.
export const CREED_TAGLINE = BRAND_TAGLINE;
export const CREED_DESCRIPTION = BRAND_DESCRIPTION;
export const CREED_META_TITLE = BRAND_META_TITLE;
