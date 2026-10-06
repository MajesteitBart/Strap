import { defineConfig, globalIgnores } from "eslint/config";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

// The rule set the app linted with on Next.js (eslint-config-next's React,
// hooks, accessibility and TypeScript rules) without the Next-specific plugin.
const eslintConfig = defineConfig([
  globalIgnores([
    "dist/**",
    ".output/**",
    ".tanstack/**",
    "src/routeTree.gen.ts",
    // Output folders left over from the Next.js build in older checkouts.
    ".next/**",
    ".next-*/**",
    // Generated deployment bundles and agent assets are validated by their own
    // tools. They include bundled and CommonJS JavaScript that is not part of
    // Strap's TypeScript application lint surface.
    ".netlify/**",
    ".agents/**",
    ".claude/**",
    "build/**",
    "packages/varlock-strap-plugin/dist/**",
  ]),
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
      import: importPlugin,
      "jsx-a11y": jsxA11y,
    },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "import/no-anonymous-default-export": "warn",
      "react/no-unknown-property": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-no-target-blank": "off",
      "jsx-a11y/alt-text": ["warn", { elements: ["img"], img: ["Image"] }],
      "jsx-a11y/aria-props": "warn",
      "jsx-a11y/aria-proptypes": "warn",
      "jsx-a11y/aria-unsupported-elements": "warn",
      "jsx-a11y/role-has-required-aria-props": "warn",
      "jsx-a11y/role-supports-aria-props": "warn",
    },
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-unused-expressions": "warn",
    },
  },
  {
    // Honour the standard "leading underscore = intentionally unused"
    // convention. Without this override, callsites that destructure or
    // accept a callback param they don't use (e.g. `(_event, session) =>
    // ...`) raise the default unused-vars rule even when the underscore
    // signals intent.
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],

      // The React 19 react-hooks plugin ships two experimental rules that
      // are overly strict for legitimate, blessed patterns we use:
      //
      // - `react-hooks/refs` flags any access to a ref object during
      //   render, including the `useImperativeHandle`-style ref exposure
      //   in `useAnimatedIconControls`. Re-architecting every animated
      //   icon as a wrapped component would be a sizeable refactor for
      //   no behavioural gain — the existing hook is the React-blessed
      //   way to expose handles via refs.
      //
      // - `react-hooks/set-state-in-effect` flags effects that call
      //   `setState` synchronously, but that's exactly the right shape
      //   when an effect's job is to synchronise external state (a
      //   auth session, a sessionStorage cache hit, etc.) into
      //   React. The flagged sites do so intentionally.
      //
      // The stable rules-of-hooks (`react-hooks/rules-of-hooks`,
      // `react-hooks/exhaustive-deps`) still fire and continue to catch
      // real bugs. Turn these two off so the noise doesn't drown out
      // genuine signal.
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
