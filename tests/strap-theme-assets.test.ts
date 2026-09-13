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

test("worktable tokens define the shared palette, typography, and geometry", async () => {
  const css = await readFile("app/globals.css", "utf8");
  const publicCss = await readFile("app/strap-public.css", "utf8");

  // Warm paper and the persistent resource colours live at the root so the
  // signed-in product and the public site share one system.
  assert.match(css, /--strap-paper: #fbf6ee;/);
  assert.match(css, /--strap-context: #2547d0;/);
  assert.match(css, /--strap-skills: #e86a1c;/);
  assert.match(css, /--strap-secrets: #7b5ce5;/);
  assert.match(css, /--strap-environments: #7fa31b;/);
  assert.match(css, /--strap-agents: #ffc93c;/);
  assert.match(css, /--strap-frame:/);
  assert.match(css, /--font-heading: var\(--font-strap-display\)/);
  assert.match(css, /--radius-md: 3px;/);
  assert.match(css, /@import "\.\/strap-public\.css";/);

  // The public site stays light-only and re-asserts its palette.
  assert.match(css, /\.strap-site \{[\s\S]*color-scheme: light;/);

  // Shared public primitives and reduced-motion handling exist.
  for (const selector of [
    ".strap-nav-toggle",
    ".strap-nav-menu",
    ".strap-page-hero",
    ".strap-cells",
    ".strap-card",
    ".strap-table",
    ".strap-prose",
    ".strap-faq",
    ".strap-plans",
    ".strap-auth",
    ".strap-consent",
    ".strap-empty",
  ]) {
    assert.ok(publicCss.includes(selector), `${selector} missing from strap-public.css`);
  }
  assert.match(publicCss, /@media \(prefers-reduced-motion: reduce\)/);
});

test("canonical Strap assets and install metadata replace legacy paths", async () => {
  const manifest = await readFile("app/manifest.ts", "utf8");
  const layout = await readFile("app/layout.tsx", "utf8");
  const brand = await readFile("components/strap/brand.tsx", "utf8");

  assert.match(manifest, /strap-icon-192\.png/);
  assert.match(manifest, /strap-icon-512\.png/);
  assert.match(layout, /strap-touch-icon\.png/);
  assert.match(layout, /manifest\.webmanifest/);
  assert.match(brand, /assets\/brand\/strap-logo\.svg/);
  assert.doesNotMatch(brand, /assets\/brand\/brandmark\.svg/);

  await Promise.all([
    access("public/assets/brand/strap-icon-192.png"),
    access("public/assets/brand/strap-icon-512.png"),
    access("public/assets/brand/strap-touch-icon.png"),
  ]);

  // The legacy scenery and the sky backdrops it became are both retired: the
  // worktable is flat, so no page or component may reference them.
  await assert.rejects(access("public/assets/brand/brandmark.svg"));
  await assert.rejects(access("public/assets/landing/scenery"));
  await assert.rejects(access("public/assets/landing/backdrops"));
  await assert.rejects(access("components/marketing/backdrop-image.tsx"));
  await assert.rejects(access("components/marketing/site-chrome.tsx"));

  const [lightEmailWordmark, darkEmailWordmark] = await Promise.all([
    readFile("public/assets/brand/brandmark-email.png"),
    readFile("public/assets/brand/brandmark-email-dark.png"),
  ]);
  assert.notDeepEqual(darkEmailWordmark, lightEmailWordmark);
});

test("public docs and home share the Strap worktable shell", async () => {
  const [docs, home, shell, css] = await Promise.all([
    readFile("components/marketing/docs-page-view.tsx", "utf8"),
    readFile("components/marketing/strap-home.tsx", "utf8"),
    readFile("components/marketing/strap-site-shell.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(docs, /<StrapSiteNav cta=\{cta\} current="docs" \/>/);
  assert.match(docs, /className="strap-site strap-docs"/);
  assert.doesNotMatch(docs, /MarketingHeroBanner|light-hero\.png/);
  assert.match(home, /<StrapSiteNav cta=\{cta\} \/>/);
  assert.match(home, /<StrapSiteFooter \/>/);
  assert.match(shell, /strap-logo\.svg/);
  assert.match(shell, /strap-nav-toggle/);
  assert.match(css, /\.strap-docs-hero/);
  assert.match(css, /\.strap-docs-section/);
});

test("every public, auth, and consent surface composes the worktable shell", async () => {
  const surfaces = [
    "components/marketing/pricing-page-view.tsx",
    "components/marketing/company-page-view.tsx",
    "components/marketing/examples-page-view.tsx",
    "components/marketing/roadmap-page-view.tsx",
    "components/marketing/learn-article.tsx",
    "components/marketing/privacy-page-view.tsx",
    "components/marketing/terms-page-view.tsx",
    "components/marketing/stack-page-view.tsx",
    "app/learn/page.tsx",
    "app/bench/page.tsx",
    "app/changelog/page.tsx",
    "app/not-found.tsx",
    "app/error.tsx",
    "components/auth/auth-shell.tsx",
    "components/strap/consent-shell.tsx",
  ];

  for (const file of surfaces) {
    const source = await readFile(file, "utf8");
    assert.match(source, /className=\{?["'`]strap-site/, `${file} must render inside .strap-site`);
    assert.doesNotMatch(source, /MarketingHeroBanner|MarketingFooter|BackdropImage/, `${file} still uses legacy chrome`);
  }

  for (const file of ["app/authorize/page.tsx", "app/device/page.tsx", "app/invite/[token]/page.tsx", "components/auth/backend-setup-screen.tsx"]) {
    const source = await readFile(file, "utf8");
    assert.match(source, /ConsentShell/, `${file} must use the shared consent shell`);
  }
});

test("transactional emails use the worktable palette and keep their template variables", async () => {
  const [confirm, reset, invite] = await Promise.all([
    readFile("supabase/email-templates/confirm-signup.html", "utf8"),
    readFile("supabase/email-templates/reset-password.html", "utf8"),
    readFile("lib/email-templates/company-invite.ts", "utf8"),
  ]);

  for (const html of [confirm, reset]) {
    assert.match(html, /\{\{ \.ConfirmationURL \}\}/);
    assert.match(html, /\{\{ \.SiteURL \}\}\/assets\/brand\/brandmark-email\.png/);
  }
  for (const html of [confirm, reset, invite]) {
    assert.match(html, /background-color:#fbf6ee/);
    assert.match(html, /border:1px solid #211e19/);
    assert.match(html, /background-color:#2547d0/);
    assert.doesNotMatch(html, /border-radius/);
    assert.doesNotMatch(html, /—/);
  }
  assert.match(invite, /\$\{acceptUrl\}/);
  assert.match(invite, /\$\{siteUrl\}\/privacy/);
});

test("solid status actions keep white labels readable in both themes", async () => {
  const css = await readFile("app/globals.css", "utf8");
  const darkStart = css.indexOf("\n.dark {");
  const light = css.slice(0, darkStart);
  const dark = css.slice(darkStart, css.indexOf("\n}", darkStart));
  const luminance = (hex: string) => {
    const channels = [0, 2, 4].map((offset) => {
      const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  for (const tone of ["success", "danger"]) {
    for (const state of ["", "-hover"]) {
      const token = `--strap-${tone}-fill${state}`;
      const pattern = new RegExp(`${token}: #([a-fA-F0-9]{6});`);
      for (const theme of [light, dark]) {
        const color = theme.match(pattern)?.[1] ?? light.match(pattern)?.[1];
        assert.ok(color, `${token} must be defined`);
        assert.ok(1.05 / (luminance(color) + 0.05) >= 4.5, `${token} must support white text`);
      }
    }
  }
});

test("public resource labels pair their fills with readable foregrounds", async () => {
  const globals = await readFile("app/globals.css", "utf8");
  const css = await readFile("app/strap-public.css", "utf8");
  const vars = new Map<string, string>();
  for (const block of [globals.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1],
    globals.match(/\.strap-site\s*\{([\s\S]*?)\n\}/)?.[1]]) {
    for (const match of (block ?? "").matchAll(/(--[\w-]+):\s*([^;]+);/g)) vars.set(match[1], match[2]);
  }
  const resolve = (value: string): string => {
    const variable = value.match(/^var\((--[\w-]+)\)$/)?.[1];
    if (variable) return resolve(vars.get(variable) ?? "");
    assert.match(value, /^#[\da-f]{3}(?:[\da-f]{3})?$/i);
    return value.length === 4 ? value.slice(1).split("").map((c) => c + c).join("") : value.slice(1);
  };
  const luminance = (value: string) => {
    const hex = resolve(value);
    const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const tone of ["context", "skills", "secrets", "environments"]) {
    for (const [source, selector] of [[css, `.strap-kicker-${tone}`],
      [globals, `.strap-resource-${tone} .strap-chip`]]) {
      const block = source.slice(source.indexOf(`${selector} {`)).split("}")[0];
      const background = block.match(/background: ([^;]+);/)?.[1];
      const foreground = block.match(/color: ([^;]+);/)?.[1];
      assert.ok(background && foreground, `${selector} must declare its colours`);
      const [a, b] = [luminance(background), luminance(foreground)].sort((x, y) => y - x);
      assert.ok((a + 0.05) / (b + 0.05) >= 4.5, `${selector} must meet 4.5:1 contrast`);
    }
  }
});
