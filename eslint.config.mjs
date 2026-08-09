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
      // SST's generated provider types and the timestamped config files it
      // writes during a deploy. Linting them is not merely noisy — the temp
      // configs are deleted as the deploy proceeds, so ESLint fails outright
      // with ENOENT on a file that existed when it globbed and is gone by the
      // time it reads it.
      ".sst/**",
      // OpenNext's build output — the Lambda bundles SST deploys.
      ".open-next/**",
    ],
  },
  {
    // SST requires the triple-slash reference: its global types (`$config`,
    // `sst`, `aws`, `$interpolate`) are ambient and an `import` would not
    // declare them. The rule is right in general and wrong for this one file.
    files: ["sst.config.ts"],
    rules: { "@typescript-eslint/triple-slash-reference": "off" },
  },
];

export default eslintConfig;
