import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ToastProvider } from "@/design-system/components";
import { headers } from "next/headers";
import { designSystemAllowed } from "@/lib/flags";
import { DsShell } from "./shell";

/**
 * Internal tool, local only. Gating at the layout covers every page beneath it,
 * so a new docs page can't accidentally ship publicly.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  // Middleware is the real gate; this is defence in depth for any path that
  // bypasses it. Reading a header also forces these pages to render per request
  // rather than being prerendered with the decision baked in.
  if (!designSystemAllowed((await headers()).get("host"))) notFound();

  return (
    <ToastProvider>
      <DsShell>{children}</DsShell>
    </ToastProvider>
  );
}
