"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Copy, MessageCircle } from "lucide-react";
import Link from "next/link";
import { getTheme } from "@/themes";
import { useTheme } from "@/design-system/ThemeProvider";
import { Divider, MusicToggle, PetalRain, ThemedOpening } from "@/design-system/components";
import type { Theme } from "@/themes";
import type { Blessing } from "@/data/blessings";
import { InviteBody } from "@/components/invite/InviteBody";
import { hostLine, monogramInitials, type InviteView } from "@/lib/invite";
import { capture } from "@/lib/posthog/client";
import { EVENTS } from "@/lib/posthog/events";
import { submitBlessing, submitRsvp } from "./actions";

/**
 * The invitation.
 *
 * This component composes nothing by hand: the hero variant, the section list,
 * their order, backgrounds, widths and headings all come from the active
 * theme's `layout` (src/themes/layout.ts). Two themes render the same invite as
 * two genuinely different pages, and adding a thirteenth theme touches no code
 * in this file.
 */
export function InviteClient({
  invite,
  blessings,
}: {
  invite: InviteView;
  blessings: Blessing[];
}) {
  const search = useSearchParams();
  const reduced = useReducedMotion();
  const { setThemeId } = useTheme();
  const [opened, setOpened] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const guestName = search.get("g") ?? undefined;
  const guestToken = search.get("t") ?? undefined;
  const themeOverride = search.get("theme");

  const theme = getTheme(themeOverride ?? invite.themeId);
  const layout = theme.layout;

  useEffect(() => setThemeId(theme.id), [theme.id, setThemeId]);

  useEffect(() => {
    if (reduced) setOpened(true);
  }, [reduced]);

  // Fire-and-forget view tracking; never blocks or breaks the invite.
  useEffect(() => {
    if (invite.isDemo) return;
    const controller = new AbortController();
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slug: invite.slug,
        guestToken,
        referrer: document.referrer || undefined,
      }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {});
    return () => controller.abort();
  }, [invite.slug, invite.isDemo, guestToken]);

  const names = hostLine(invite.hosts);
  const initials = monogramInitials(invite.hosts);

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href.split("?")[0]);
    setCopied(true);
    capture(EVENTS.invite_link_copied, { slug: invite.slug, surface: "invite_footer" });
    setTimeout(() => setCopied(false), 2000);
  };

  /** The wax seal breaking — the moment a guest actually engages. */
  const handleOpened = () => {
    setOpened(true);
    capture(EVENTS.invite_envelope_opened, {
      slug: invite.slug,
      event_type: invite.eventType,
      theme_id: theme.id,
      personalised: Boolean(guestName),
    });
  };

  if (!opened) {
    return <InviteCover theme={theme} names={names} initials={initials} guestName={guestName} onOpened={handleOpened} />;
  }

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-bg pb-24"
    >
      {/* A theme may opt out of falling petals entirely. */}
      {layout.ornament !== "none" && (
        <PetalRain type={theme.petalType} density={layout.ornament === "rich" ? 12 : 6} />
      )}
      <MusicToggle />

      <InviteBody
        invite={invite}
        theme={theme}
        blessings={blessings}
        guestName={guestName}
        onOpenPhoto={setLightbox}
        onRsvp={(submission) =>
          submitRsvp({
            slug: invite.slug,
            guestName: submission.guestName,
            attending: submission.attending,
            headcount: submission.headcount,
            subEventKeys: submission.events,
            meal: submission.meal,
            message: submission.message,
            guestToken,
          })
        }
        onBlessing={(blessing) => submitBlessing({ slug: invite.slug, ...blessing })}
      />


      {lightbox && (
        <button
          className="fixed inset-0 flex cursor-zoom-out items-center justify-center bg-overlay p-6"
          style={{ zIndex: "var(--z-overlay)" }}
          onClick={() => setLightbox(null)}
          aria-label="Close photo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Photograph, enlarged" className="max-h-full max-w-full rounded-card shadow-lifted" />
        </button>
      )}

      <InviteFooter
        theme={theme}
        invite={invite}
        names={names}
        copied={copied}
        onCopy={copyLink}
      />
    </motion.div>
  );
}

/* ---------- the sealed cover, before the guest opens it ---------- */

function InviteCover({
  theme,
  names,
  initials,
  guestName,
  onOpened,
}: {
  theme: Theme;
  names: string;
  initials: [string, string];
  guestName?: string;
  onOpened: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full">
        <p className="mb-8 text-center type-overline">{names} invite you</p>
        <ThemedOpening theme={theme} initials={initials} guestName={guestName} onOpened={onOpened} />
      </div>
    </div>
  );
}

/* ---------- footer, in the theme's three flavours ---------- */

function InviteFooter({
  theme,
  invite,
  names,
  copied,
  onCopy,
}: {
  theme: Theme;
  invite: InviteView;
  names: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const variant = theme.layout.footer;

  return (
    <footer
      className="section-column mt-24 text-center"
      data-width={variant === "minimal" ? "narrow" : "regular"}
    >
      {variant === "ornate" && (
        <Divider variant="motif" motif={theme.motifSet.divider} className="mb-10" />
      )}
      {variant === "centered" && <Divider className="mb-10" />}

      {invite.hashtag && <p className="type-h2 text-primary">{invite.hashtag}</p>}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`You're invited! ${names} — `)}`}
          target="_blank"
          rel="noreferrer"
          onClick={() => capture(EVENTS.invite_shared, { slug: invite.slug, channel: "whatsapp" })}
          className="inline-flex items-center gap-2 rounded-pill border border-ornate/60 px-5 py-2 text-sm font-semibold text-primary hover:bg-accent/10"
        >
          <MessageCircle className="size-4" /> Share on WhatsApp
        </a>
        <button
          onClick={onCopy}
          className="inline-flex cursor-pointer items-center gap-2 rounded-pill border border-ornate/60 px-5 py-2 text-sm font-semibold text-primary hover:bg-accent/10"
        >
          <Copy className="size-4" /> {copied ? "Copied!" : "Copy link"}
        </button>
      </div>

      <Link href="/" className="mt-10 inline-block">
        <span className="type-caption">Crafted with</span>{" "}
        <span className="font-display text-lg font-semibold text-primary">Amantrika</span>
      </Link>
    </footer>
  );
}
