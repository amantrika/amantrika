"use client";

import { icons } from "@/design-system/icons";

/**
 * The "Made with Amantrika" badge on a free invitation.
 *
 * This replaces the tiled watermark overlay. A watermark defaces a family's
 * invitation to punish them for not paying; a badge sits politely in the corner
 * and is the only organic acquisition loop the product has — a guest taps it and
 * becomes the next couple. Defacing the page would make guests resent the mark
 * rather than follow it, which loses on both counts.
 *
 * The click is recorded before navigation, but never blocks it: `sendBeacon`
 * hands the request to the browser to deliver in the background, and if it fails
 * the guest still gets where they were going.
 */

const Shehnai = icons.shehnai;

export function MadeWithBadge({ slug }: { slug: string }) {
  function recordClick() {
    const payload = JSON.stringify({ slug, placement: "invite_badge" });

    try {
      // Survives the page being torn down by the navigation, which a normal
      // fetch would not.
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/badge-click", new Blob([payload], { type: "application/json" }));
        return;
      }
      void fetch("/api/badge-click", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Counting a click must never cost a guest their navigation.
    }
  }

  return (
    <a
      href="/?utm_source=invite_badge"
      target="_blank"
      rel="noopener"
      onClick={recordClick}
      // `print:hidden` because a printed invitation should carry no advertising.
      className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-pill border border-ornate/60 bg-surface/90 px-3.5 py-2 text-xs font-semibold text-primary shadow-resting backdrop-blur transition-shadow hover:shadow-gold-glow print:hidden"
    >
      <Shehnai aria-hidden className="size-4 text-accent" />
      Made with Amantrika
    </a>
  );
}
