import { strict as assert } from "node:assert";
import { test } from "node:test";
import { markdownToRichHtml } from "../lib/rich-text.ts";
import { sectionToMarkdown, type StrapSection } from "../lib/strap-data.ts";

function section(content: string): StrapSection {
  return { id: "preferences", name: "Preferences", kind: "rich-text", content } as StrapSection;
}

test("inline code survives markdown to rich text and back", () => {
  const html = markdownToRichHtml("Apply the `unslop` skill to all prose.");
  assert.match(html, /<code>unslop<\/code>/);
  assert.doesNotMatch(html, /CREED|INLINE|\uE000|\uE001/);
  assert.match(sectionToMarkdown(section(html)), /Apply the `unslop` skill to all prose\./);
});

test("underscores inside inline code are not treated as emphasis", () => {
  const html = markdownToRichHtml("Run `db_migrate_all` and keep _this_ italic.");
  assert.match(html, /<code>db_migrate_all<\/code>/);
  assert.match(html, /<em>this<\/em>/);
});

test("several code spans on one line keep their own text", () => {
  const html = markdownToRichHtml("Use `a` then `b` then `c`.");
  assert.deepEqual([...html.matchAll(/<code>([^<]*)<\/code>/g)].map((m) => m[1]), ["a", "b", "c"]);
});

test("text that imitates a placeholder cannot inject code spans", () => {
  const html = markdownToRichHtml("Literal \uE0000\uE001 and `real`.");
  assert.deepEqual([...html.matchAll(/<code>([^<]*)<\/code>/g)].map((m) => m[1]), ["real"]);
});
