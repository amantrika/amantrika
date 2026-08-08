/**
 * The design-system docs are an internal tool: a living reference for building
 * Amantrika, not a public product surface. Shipping it publicly leaks
 * unreleased components, doubles the crawlable surface area, and invites
 * questions about pages that aren't for customers.
 *
 * The decision is made from the **request host**, not from an environment
 * variable. Next inlines `process.env.*` into the middleware and static bundles
 * at build time, so an env-based flag is frozen to whatever was set during the
 * build — locally that is "enabled", and it would then serve on the deployment
 * too. A hostname can only be known per request, so it cannot be baked in.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

/** True only when served from a local development host. */
export function isLocalHost(host: string | null | undefined): boolean {
  if (!host) return false;
  // Strip the port: "localhost:3000" → "localhost".
  const name = host.split(":")[0].trim().toLowerCase();
  return LOCAL_HOSTS.has(name) || name.endsWith(".local");
}

/**
 * Escape hatch for sharing the docs from a preview deployment. Read in
 * middleware, where an inlined build-time value is still fine because turning
 * it on is a deliberate, per-deployment act.
 */
export const designSystemForced = process.env.SHOW_DESIGN_SYSTEM === "1";

export function designSystemAllowed(host: string | null | undefined): boolean {
  return designSystemForced || isLocalHost(host);
}

/**
 * The Keystatic editor, same rule and a stronger reason.
 *
 * It is configured with `storage: { kind: "local" }`, so it edits files in a
 * checkout. On a deployment there is no writable repo behind the process and
 * every save would fail — an admin UI that cannot work, on a public origin, is
 * pure surface area. There is deliberately no `SHOW_` escape hatch: unlike the
 * design-system docs, there is no version of this worth sharing from a preview.
 */
export function keystaticAllowed(host: string | null | undefined): boolean {
  return isLocalHost(host);
}
