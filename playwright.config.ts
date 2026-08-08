import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Tests read the same .env.local the app does, so a run exercises the real
// Supabase project, the real Resend key and the real payment provider.
loadEnvConfig(process.cwd());

const PORT = Number(process.env.E2E_PORT ?? 3100);

/**
 * When E2E_BASE_URL is set, tests run against that origin and no server is
 * started — that is how you point the suite at a Vercel preview or at
 * production. Otherwise a production build is built and served locally.
 *
 * Production build, not `next dev`: the dev server's HMR invalidates route
 * handlers after `revalidatePath`, which makes the payment webhook 404 on the
 * second call. That is a dev artifact, but it would make this suite lie.
 */
const externalTarget = process.env.E2E_BASE_URL;
const baseURL = externalTarget ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  globalTeardown: "./tests/e2e/global-teardown.ts",

  // A failing assertion should be reproducible, not a coin toss.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // 90s, not 60s: the first navigation of a run has timed out on a loaded
  // machine even against a warm production server. That is contention, not a
  // slow page — the budget test still holds `/invite/[slug]` to 100KB — but a
  // suite that goes red for reasons unrelated to the code stops being believed.
  timeout: 90_000,
  expect: { timeout: 10_000 },

  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],

  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      // The invitation is read by 300 relatives on phones. If it only works on
      // a desktop viewport, it does not work.
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: /(invite|marketing)\.spec\.ts/,
    },
  ],

  webServer: externalTarget
    ? undefined
    : {
        command: `npm run build && npx next start -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          // `next start` runs with NODE_ENV=production, where the mock checkout
          // is deliberately switched off. The suite has to opt in explicitly —
          // which is the guard working, not a workaround for it.
          ALLOW_MOCK_PAYMENTS: "true",
          // Its own build directory, so a `next dev` running in the same
          // checkout cannot clobber the build mid-run and make the suite report
          // failures that are really just a half-deleted `.next`.
          NEXT_DIST_DIR: ".next-e2e",
        },
      },
});
