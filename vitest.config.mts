import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Unit tests only. Anything that needs a browser, a database or a running
 * server belongs in `tests/e2e` under Playwright — see `playwright.config.ts`.
 */
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    reporters: ["default"],
    // Hermetic by design: unit tests must not depend on a real project's
    // credentials, and must not be able to reach one by accident. `src/lib/env`
    // validates at import time, so these need to exist but never be valid.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "unit-test-anon-key",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `import "server-only"` throws outside a React Server Component. The
      // modules under test are server-only by design, so the guard is stubbed
      // rather than removed — production still gets the real one.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
});
