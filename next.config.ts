import type { NextConfig } from "next";

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
// Static assets (the JS snippet, feature-flag payloads) come from the `-assets`
// host; events go to the ingestion host itself.
const POSTHOG_ASSETS = POSTHOG_HOST.replace(".i.posthog.com", "-assets.i.posthog.com");

const nextConfig: NextConfig = {
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
};

export default nextConfig;
