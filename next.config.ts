import type { NextConfig } from "next";

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
// Static assets (the JS snippet, feature-flag payloads) come from the `-assets`
// host; events go to the ingestion host itself.
const POSTHOG_ASSETS = POSTHOG_HOST.replace(".i.posthog.com", "-assets.i.posthog.com");

const nextConfig: NextConfig = {
  /**
   * Two `next dev` processes in one checkout corrupt each other's `.next`.
   * Setting NEXT_DIST_DIR gives a second server its own build directory, which
   * is the only way to run one alongside another (or alongside a build).
   * Unset — which is every deployment — this is the stock `.next`.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",

  /**
   * Same-origin proxy for PostHog. Content blockers block `*.posthog.com`
   * outright, which silently drops a large share of events; routing through our
   * own domain keeps the data honest. Must stay in sync with
   * `posthogProxyPath` in src/lib/env.ts.
   */
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: `${POSTHOG_ASSETS}/static/:path*` },
      { source: "/ingest/:path*", destination: `${POSTHOG_HOST}/:path*` },
    ];
  },

  // PostHog's proxied endpoints respond to requests with a trailing slash.
  skipTrailingSlashRedirect: true,

  /**
   * Compresses webpack's filesystem cache.
   *
   * Context for the "Serializing big strings … impacts deserialization
   * performance" notice you will still see: it concerns webpack's *build cache*,
   * not the shipped bundle. Nothing a visitor loads is slower because of it. It
   * appears because the MDX content and the inlined SVG icon set are large
   * strings, which webpack stores as strings rather than Buffers when caching.
   *
   * Compression genuinely shrinks that cache, but does not remove the notice —
   * it is emitted by webpack's infrastructure logger, which `ignoreWarnings`
   * does not reach. Silencing it would mean lowering the log level and hiding
   * real warnings with it, which is a bad trade for cosmetic quiet.
   */
  webpack: (config, { dev }) => {
    if (!dev && config.cache && typeof config.cache === "object") {
      config.cache = { ...config.cache, compression: "gzip" };
    }

    // Hides webpack's *infrastructure* chatter — cache and file-watching notices
    // such as "Serializing big strings …" — while leaving compilation warnings
    // and errors untouched. They travel through a different channel (stats), so
    // a genuine problem in your code still surfaces.
    //
    // Worth doing because the notice is unactionable: it describes webpack's own
    // build cache, not the shipped bundle, and the large strings causing it are
    // the MDX content and the inlined icon set — both things we want.
    config.infrastructureLogging = {
      ...config.infrastructureLogging,
      level: "error",
    };

    return config;
  },
};

export default nextConfig;
