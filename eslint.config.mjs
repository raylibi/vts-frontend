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
  ]),
  {
    rules: {
      // Argumen yang sengaja tidak dipakai diberi prefix "_" (mis. callback
      // dengan signature tetap). Konvensi standar, bukan dead code.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // Inisialisasi state dari sumber client-only (localStorage untuk auth,
      // flag loading sebelum fetch) memang dilakukan di dalam useEffect karena
      // tidak tersedia saat SSR. Proyek ini memakai React Compiler
      // (babel-plugin-react-compiler) yang sudah menangani optimasi re-render
      // yang menjadi kekhawatiran rule ini, sehingga pola tersebut aman.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
