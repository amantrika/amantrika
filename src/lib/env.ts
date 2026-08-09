/**
 * Fail fast on missing configuration rather than at the first query.
 * Only NEXT_PUBLIC_* vars may be referenced from client components.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),
};

/* ------------------------------------------------------------------ PostHog */

/**
 * The `phc_` project token is a *publishable* key — it is meant to ship in the
 * client bundle and can only write events, never read them. Analytics is
 * optional: when the token is absent (a fork, a preview without secrets) every
 * capture call becomes a no-op rather than throwing.
 */
export const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ?? "";

/** Upstream PostHog ingestion host. US cloud by default. */
export const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

/**
 * Browser events are sent to this same-origin path, which `next.config.ts`
 * rewrites to `posthogHost`. Going through our own domain means content
 * blockers — which block `*.posthog.com` by default — don't silently delete a
 * large slice of the data.
 */
export const posthogProxyPath = "/ingest";

export const analyticsEnabled = posthogKey.length > 0;

/**
 * Cloudinary cloud holding the theme-gallery photographs.
 *
 * The `atheme` rows store delivery paths without a cloud name — see the comment
 * on that migration — so this is what turns a row into a URL. Public by
 * necessity: the browser fetches the image. It is an account identifier, not a
 * credential; the API secret is not in this repo and must not be.
 *
 * Empty is a legitimate state (a fork, a preview without the account), and
 * `cloudinaryUrl()` returns null rather than throwing, so a missing cloud costs
 * the gallery and nothing else.
 */
export const cloudinaryCloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD ?? "";

/** Server-only. Throws if imported into a client bundle. */
export function serviceRoleKey(): string {
  if (typeof window !== "undefined") {
    throw new Error("serviceRoleKey() must never be called in the browser.");
  }
  return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Server-only. Throws if imported into a client bundle. */
export function resendApiKey(): string {
  if (typeof window !== "undefined") {
    throw new Error("resendApiKey() must never be called in the browser.");
  }
  return required("RESEND_API_KEY", process.env.RESEND_API_KEY);
}

/**
 * Sender for all transactional mail. Must be an address on a domain verified in
 * Resend; `onboarding@resend.dev` works without DNS but only delivers to the
 * Resend account owner, so it is a placeholder, not a production value.
 */
export const emailFrom = process.env.EMAIL_FROM ?? "Amantrika <onboarding@resend.dev>";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
