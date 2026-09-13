import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getSchema, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

test("untrusted editor attributes cannot introduce inherited event handlers", () => {
  const attributes: Record<string, unknown> = JSON.parse('{"__proto__":{"onerror":"unexpected"},"class":"imported"}');
  const merged = mergeAttributes({ class: "editor" }, attributes);
  assert.equal(Object.getPrototypeOf(merged), Object.prototype);
  assert.equal(merged.onerror, undefined);
  assert.equal(merged.class, "editor imported");
  const enumerableNames: string[] = [];
  for (const name in merged) enumerableNames.push(name);
  assert.ok(!enumerableNames.includes("onerror"));
});

test("the patched editor schema preserves headings, marks, lists and code blocks", () => {
  const document = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Profile" }] },
      { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Keep context specific." }] },
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "One durable fact" }] }] }] },
      { type: "codeBlock", attrs: { language: "typescript" }, content: [{ type: "text", text: "const context = true;" }] },
    ],
  };
  const schema = getSchema([StarterKit]);
  const parsed = schema.nodeFromJSON(document);
  parsed.check();
  assert.equal(parsed.child(0).attrs.level, 2);
  assert.equal(parsed.child(1).firstChild?.marks[0]?.type.name, "bold");
  assert.equal(parsed.child(2).firstChild?.type.name, "listItem");
  assert.equal(parsed.child(3).attrs.language, "typescript");
  assert.equal(schema.nodeFromJSON(parsed.toJSON()).textContent, parsed.textContent);
});
