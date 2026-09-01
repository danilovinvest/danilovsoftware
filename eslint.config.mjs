import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Composants livrés par le CLI shadcn : ils sont régénérés par
  // `shadcn add` et ne suivent pas nos règles de hooks. Les corriger à la main
  // serait effacé au prochain ajout de composant.
  globalIgnores(["components/ui/**", "hooks/use-mobile.ts"]),

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
