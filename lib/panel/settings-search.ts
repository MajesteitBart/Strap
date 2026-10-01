// Command-search destinations and their local aliases. Account entries open
// /account and apply in every Strap; settings entries open the personal
// /settings screen.
export const ACCOUNT_SEARCH_COMMANDS = [
  {
    key: "profile",
    label: "Profile",
    keywords: ["name", "email", "account", "display name", "avatar", "picture"],
  },
  {
    key: "security",
    label: "Two-factor authentication",
    keywords: ["2fa", "mfa", "security", "authenticator", "recovery codes"],
  },
  {
    key: "danger",
    label: "Delete account",
    keywords: ["delete account", "remove account"],
  },
];

export const SETTINGS_SEARCH_COMMANDS = [
  {
    key: "agent-edits",
    label: "Agent edit behaviour",
    keywords: ["permissions", "propose", "direct", "read-only", "hidden", "agents"],
  },
  {
    key: "integrations",
    label: "Integrations",
    keywords: ["google", "github", "twitter", "x", "link account", "connect account"],
  },
  {
    key: "version-control",
    label: "Version control",
    keywords: ["github", "repo", "repository", "branch", "sync", "push", "pull", "commit"],
  },
  {
    key: "archived",
    label: "Archived sections",
    keywords: ["restore", "archive", "archived sections"],
  },
  {
    key: "data",
    label: "Export data",
    keywords: ["export", "download", "backup", "markdown", "word count"],
  },
];
