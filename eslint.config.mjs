import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // `.next-*` catches the alternate build directories NEXT_DIST_DIR creates
    // (a second dev server, the e2e build). Without it `npx eslint .` reports
    // ~33,000 problems from generated code and the real ones are invisible.
    ignores: [
      ".next/**",
      ".next-*/**",
      "out/**",
      "build/**",
      // Test artifacts. `playwright-report/` embeds the trace viewer, which is
      // another ~3,000 problems' worth of bundled third-party JavaScript.
      "playwright-report/**",
      "test-results/**",
      "blob-report/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
