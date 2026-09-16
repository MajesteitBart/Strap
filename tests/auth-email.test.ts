import assert from "node:assert/strict";
import test from "node:test";
import { renderAuthEmail } from "../lib/email-templates/auth.ts";

test("account emails preserve the theme and escape token-bearing URLs", () => {
  for (const kind of ["confirmation", "reset"] as const) {
    const html = renderAuthEmail(kind, 'https://example.invalid/action?token=opaque&next="bad"', "https://example.invalid");
    assert.match(html, /background-color:#fbf6ee/);
    assert.match(html, /border:1px solid #211e19/);
    assert.match(html, /background-color:#2547d0/);
    assert.match(html, /token=opaque&amp;next=&quot;bad&quot;/);
    assert.doesNotMatch(html, /\{\{|border-radius|—/);
  }
});
