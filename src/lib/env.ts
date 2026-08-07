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

/** Server-only. Throws if imported into a client bundle. */
export function serviceRoleKey(): string {
  if (typeof window !== "undefined") {
    throw new Error("serviceRoleKey() must never be called in the browser.");
  }
  return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
