import { createElement } from "react";
import type { WatermarkPlan } from "@/lib/watermark";

/**
 * Renders the watermark as real, server-rendered elements.
 *
 * A Server Component with no interactivity and no `"use client"`: the guest
 * bundle must not grow because someone didn't pay, and — more importantly — a
 * watermark the client could render is a watermark the client could skip.
 *
 * The marks are returned as a flat fragment rather than wrapped in a container,
 * so there is no single parent to delete.
 */
export function Watermark({ plan }: { plan: WatermarkPlan }) {
  return (
    <>
      {plan.marks.map((mark) =>
        createElement(
          mark.tag,
          {
            key: mark.key,
            className: mark.className,
            style: mark.style,
            // Announced once, to the one mark that sits in the content. The
            // overlays are decorative repetition and would otherwise be read
            // out five times.
            "aria-hidden": mark.placement === "overlay" ? true : undefined,
          },
          mark.text
        )
      )}
    </>
  );
}
