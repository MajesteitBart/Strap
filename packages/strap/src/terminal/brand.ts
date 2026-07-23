import { CLI_VERSION } from "../constants.js";

const RESET = "\u001b[0m";
const COLORS = [
  "\u001b[38;2;53;114;239m",
  "\u001b[38;2;242;134;54m",
  "\u001b[38;2;146;93;229m",
  "\u001b[38;2;57;161;105m",
] as const;
const BLOCK = "████";

export function supportsColor(): boolean {
  return Boolean(process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== "dumb");
}

function renderMark(color: boolean): string {
  const bars = COLORS.map((tone) => `${color ? tone : ""}${BLOCK}${color ? RESET : ""}`);
  return Array.from({ length: 4 }, () => bars.join(" ")).join("\n");
}

export function renderBrand(columns = process.stdout.columns ?? 80): string {
  const color = supportsColor();
  const label = `${color ? COLORS[0] : ""}Strap${color ? RESET : ""} ${CLI_VERSION}`;
  if (columns < 44) return label;

  const rows = renderMark(color).split("\n");
  rows[2] = `${rows[2]}     ${label}`;
  return rows.join("\n");
}
