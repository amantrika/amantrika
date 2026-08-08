import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { keystaticAllowed } from "@/lib/flags";

/**
 * Keystatic renders its own full-page chrome, so this layout exists to do two
 * things and nothing else: keep the editor out of search results, and repeat
 * the local-host gate that middleware already applies. Defence in depth, the
 * same shape as `src/app/design-system/layout.tsx` — reading a header also
 * forces a per-request render, so the decision can never be baked into
 * prerendered HTML.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function KeystaticLayout({ children }: { children: React.ReactNode }) {
  if (!keystaticAllowed((await headers()).get("host"))) notFound();

  return children;
}
