import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const richTextCompatibilityClasses = [
  "creed-callout",
  "creed-code-block",
  "creed-inline-tag",
  "creed-list",
  "creed-list-bullet",
  "creed-list-item",
  "creed-list-ordered",
] as const;

test("shared theme uses Strap namespaces with explicit rich-text compatibility", async () => {
  const css = await readFile("app/globals.css", "utf8");

  assert.match(css, /--strap-background:/);
  assert.match(css, /\.strap-scrollbar/);
  assert.match(css, /@keyframes strap-copy-cycle/);
  assert.match(css, /@keyframes strap-tab-spin/);
  assert.doesNotMatch(css, /--creed-/);
  assert.doesNotMatch(css, /\.creed-(?:copy-cycle|diff-|invert-on-dark|scrollbar|tab-|theme-switching)/);

  for (const className of richTextCompatibilityClasses) {
    assert.match(css, new RegExp(`\\.${className}(?![a-z-])`));
  }
});

test("canonical Strap assets and install metadata replace legacy paths", async () => {
  const manifest = await readFile("app/manifest.ts", "utf8");
  const layout = await readFile("app/layout.tsx", "utf8");
  const brand = await readFile("components/strap/brand.tsx", "utf8");
  const backdrop = await readFile("components/marketing/backdrop-image.tsx", "utf8");

  assert.match(manifest, /strap-icon-192\.png/);
  assert.match(manifest, /strap-icon-512\.png/);
  assert.match(layout, /strap-touch-icon\.png/);
  assert.match(layout, /manifest\.webmanifest/);
  assert.match(brand, /assets\/brand\/strap-logo\.svg/);
  assert.doesNotMatch(brand, /assets\/brand\/brandmark\.svg/);
  assert.match(backdrop, /assets\/landing\/backdrops/);
  assert.doesNotMatch(backdrop, /assets\/landing\/scenery/);

  await Promise.all([
    access("public/assets/brand/strap-icon-192.png"),
    access("public/assets/brand/strap-icon-512.png"),
    access("public/assets/brand/strap-touch-icon.png"),
    access("public/assets/landing/backdrops/light-hero.png"),
    access("public/assets/landing/backdrops/dark-hero.avif"),
  ]);

  await assert.rejects(access("public/assets/brand/brandmark.svg"));
  await assert.rejects(access("public/assets/landing/scenery"));

  const [lightEmailWordmark, darkEmailWordmark] = await Promise.all([
    readFile("public/assets/brand/brandmark-email.png"),
    readFile("public/assets/brand/brandmark-email-dark.png"),
  ]);
  assert.notDeepEqual(darkEmailWordmark, lightEmailWordmark);
});
