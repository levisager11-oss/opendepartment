import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

/**
 * There was no lint here at all, which is how two dead imports and a couple
 * of unused bindings got in. next/core-web-vitals carries the rules that
 * matter for a Next app; the two added below are the ones that would have
 * caught what was actually wrong.
 *
 * `_`-prefixed names stay allowed: a deliberately ignored parameter should
 * not have to be deleted to satisfy the linter.
 */
const config = [
  {
    // Generated, both of them: next-env.d.ts is rewritten by `next build` and
    // schema-sql.generated.ts by scripts/build-schema.mjs, so a complaint
    // about either is a complaint nobody can act on.
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "src/lib/tenant/schema-sql.generated.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      // Advisory, not blocking: VaultBrowser suppresses it on purpose and
      // says why, and turning that into an error would only invite the
      // suppression to spread.
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default config;
