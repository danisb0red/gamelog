import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The Expo app is a separate project with its own toolchain — Next's
    // web rules (jsx-a11y, next/image) don't apply to React Native views.
    "mobile/**",
    // Agent worktrees live inside the repo while parallel work is in flight,
    // each with its own node_modules and build output. Linting them reported
    // ~18,000 phantom problems against the real tree.
    ".claude/**",
  ]),
]);

export default eslintConfig;
