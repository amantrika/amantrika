"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, Lock, Maximize2 } from "lucide-react";
import { Button, Loader, Modal, PhoneFrame } from "@/design-system/components";
import type { AthemeCard } from "@/lib/themes/atheme";

/**
 * The live invitation, inside a phone.
 *
 * A photograph of a design answers "is it pretty". Only the real thing answers
 * "what happens when my aunt taps it" — these invitations open with a wax seal
 * and an envelope, and that moment is most of what is being sold. So the
 * preview is an iframe of the running invitation rather than the Cloudinary
 * still, and the still becomes the fallback.
 *
 * Mounted only while the dialog is open, and never before: five iframes on the
 * landing page would be five invitations booted on a phone that came for the
 * marketing copy.
 *
 * `invite.amantrika.com` sends no `X-Frame-Options` and no `frame-ancestors`,
 * which is what makes this possible — checked, not assumed. If that ever
 * changes the frame goes blank *silently*, because a browser will not tell a
 * page cross-origin why its child failed. Hence the timeout: after seven
 * seconds with no `load`, this stops waiting and shows the photograph with a
 * link out, so the failure degrades to the old behaviour instead of to an empty
 * black rectangle.
 */
function LivePreview({ card }: { card: AthemeCard }) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    if (state !== "loading") return;
    const timer = setTimeout(() => setState("failed"), 7000);
    return () => clearTimeout(timer);
  }, [state]);

  if (state === "failed") {
    return (
      <div className="mx-auto max-w-md text-center">
        {card.previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.previewUrl}
            alt={`${card.name} — the invitation shown on three phone screens`}
            width={1920}
            height={1080}
            className="w-full rounded-card border border-ornate/30"
          />
        )}
        <p className="mt-3 type-caption text-muted">
          The live preview didn&apos;t load — here is the design as a photograph.
          It opens on its own page.
        </p>
      </div>
    );
  }

  return (
    <PhoneFrame
      // Clamped against the dialog, which is `max-h-[88vh]` and also has to fit
      // a title, a caption and the actions. The reserve is sized for the worst
      // case rather than the average: on a narrow screen the caption runs to
      // three lines and the two buttons wrap onto their own rows, and a Select
      // button pushed below the fold is a Select button nobody presses.
      height="min(844px, calc(88vh - 21rem))"
    >
      {state === "loading" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black">
          <Loader size="lg" label={`Loading the ${card.name} preview`} />
          <p className="type-caption text-white/60">Opening {card.name}…</p>
        </div>
      )}
      <iframe
        src={card.previewHref}
        title={`${card.name} — a live preview of the invitation`}
        onLoad={() => setState("ready")}
        // `allow-same-origin` is what lets the invitation keep *its own*
        // origin, which it needs: without it the document is forced into an
        // opaque origin and `sessionStorage` throws, which is precisely how
        // this first rendered — a perfect phone with a blank white screen.
        //
        // Pairing it with `allow-scripts` is the combination usually warned
        // about, and the warning does not apply here: it only matters when the
        // framed document is same-origin with the framing page, where the pair
        // would let it reach out and drop its own sandbox. `invite.amantrika.com`
        // is a different origin from this one, so it gains nothing it did not
        // already have, and the sandbox still withholds top-level navigation,
        // downloads and pointer lock.
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="strict-origin-when-cross-origin"
        className="size-full border-0"
      />
    </PhoneFrame>
  );
}

/**
 * The Amantrika theme gallery.
 *
 * These cards are photographs of real invitations, not the live miniatures
 * `ThemePreviewCard` draws. The two coexist on purpose and answer different
 * questions: this shows what the designs *look like finished*, on a phone, with
 * someone's actual photographs in them — which is what a couple is deciding —
 * while `ThemePreviewCard` shows what the renderer will produce.
 *
 * A card is display; `renderThemeId` is what selecting it actually builds. That
 * indirection lives in the data (`atheme.render_theme_id`) rather than here, so
 * this component never learns which theme is which — the rule in CLAUDE.md §2.5
 * applies to a gallery as much as to the renderer.
 *
 * Used twice: on the landing page, where Select starts the builder, and inside
 * the builder's theme step, where Select sets the draft's theme.
 */
export function AthemeGallery({
  cards,
  onSelect,
  selectedRenderThemeId,
  selectLabel = "Select",
  onPreview,
}: {
  cards: AthemeCard[];
  onSelect: (card: AthemeCard) => void;
  /**
   * The theme currently chosen, so the matching card reads as chosen. Compared
   * on `renderThemeId` rather than card id because that is what the invitation
   * actually stores — a host who picked the theme by another route should still
   * see it marked here.
   */
  selectedRenderThemeId?: string;
  selectLabel?: string;
  /** Fired when a preview is opened. Optional — the builder and the landing page report it differently. */
  onPreview?: (card: AthemeCard) => void;
}) {
  const [preview, setPreview] = useState<AthemeCard | null>(null);

  const openPreview = (card: AthemeCard) => {
    setPreview(card);
    onPreview?.(card);
  };
  const closePreview = () => setPreview(null);

  // Cloudinary unconfigured, or the catalogue is empty. Rendering an empty grid
  // with a heading above it looks like a bug; rendering nothing is honest.
  if (!cards.length) return null;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const chosen = card.renderThemeId === selectedRenderThemeId;
          return (
            <figure
              key={card.id}
              className={`overflow-hidden rounded-card border transition-all ${
                chosen ? "ornate-border shadow-gold-glow" : "border-ornate/40 hover:border-ornate"
              }`}
            >
              {/*
                The image is the product here, so it opens the preview on click
                as well as through the button — but the button stays, because a
                clickable image with no affordance is invisible to anyone not
                already looking for it, and to a keyboard.
              */}
              <button
                type="button"
                onClick={() => openPreview(card)}
                className="group relative block w-full cursor-pointer bg-surface"
                aria-label={`Preview ${card.name}`}
              >
                {card.imageUrl ? (
                  <img
                    src={card.imageUrl}
                    // Named, not decorative: this is the only description of the
                    // design a screen reader or a crawler gets.
                    alt={`${card.name} — the invitation shown on three phone screens`}
                    width={1920}
                    height={1080}
                    loading="lazy"
                    decoding="async"
                    // Explicit ratio so the grid does not reflow as images
                    // arrive — the zero-CLS rule in CLAUDE.md §3.
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-surface">
                    <span className="type-caption text-muted">Preview unavailable</span>
                  </div>
                )}
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-overlay opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Maximize2 className="size-6 text-white" />
                </span>
              </button>

              <figcaption className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-display text-lg font-semibold text-primary">{card.name}</p>
                  {card.isPremium ? (
                    // Said on the card rather than at checkout. Three of the
                    // five build a premium theme, and finding that out after
                    // choosing is the worst place to learn it.
                    <p className="mt-0.5 flex items-center gap-1 type-caption font-semibold text-accent">
                      <Lock className="size-3.5" /> Premium theme
                    </p>
                  ) : (
                    <p className="mt-0.5 type-caption text-muted">Included on every plan</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openPreview(card)}>
                    Preview
                  </Button>
                  {chosen ? (
                    <p className="flex items-center gap-1 text-sm font-bold text-success">
                      <Check className="size-4" /> Chosen
                    </p>
                  ) : (
                    <Button size="sm" onClick={() => onSelect(card)}>
                      {selectLabel}
                    </Button>
                  )}
                </div>
              </figcaption>
            </figure>
          );
        })}
      </div>

      <Modal open={Boolean(preview)} onClose={closePreview} title={preview?.name} wide>
        {preview && (
          <div>
            <p className="mb-4 text-center type-caption text-muted">
              The real invitation, running. Tap the seal to open it — this is
              exactly what lands on a guest&apos;s phone.
            </p>

            <LivePreview key={preview.id} card={preview} />

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="type-caption text-muted">
                {preview.isPremium
                  ? "A premium design — needs a paid plan."
                  : "Included on every plan."}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {/* An escape hatch that is also the accessible route: a phone
                    frame is a small window, and some people want the whole
                    screen or their own device. */}
                <a href={preview.previewHref} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm">
                    Open full size <ExternalLink aria-hidden className="size-3.5" />
                  </Button>
                </a>
                <Button
                  onClick={() => {
                    onSelect(preview);
                    closePreview();
                  }}
                >
                  {selectLabel} {preview.name}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
