import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "dev-dist", "node_modules", "playwright-report", "test-results", ".wrangler", ".lighthouseci"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/consistent-type-imports": "error",
      eqeqeq: "error",
      "no-console": ["warn", { allow: ["warn", "error", "log"] }],
    },
  },
);
