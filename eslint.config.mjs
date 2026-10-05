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
    // Migration fragments: solution bodies without the starter's classes.
    "scripts/legacy/files/**",
  ]),
  {
    // Starters are signatures to fill in: their parameters are unused on purpose.
    files: ["content/questions/**/starter.ts"],
    rules: { "@typescript-eslint/no-unused-vars": "off" },
  },
]);

export default eslintConfig;
