"use client";

import { useState } from "react";
import { Check, Lock, Maximize2 } from "lucide-react";
import { Button, Modal } from "@/design-system/components";
import type { AthemeCard } from "@/lib/themes/atheme";

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
}) {
  const [preview, setPreview] = useState<AthemeCard | null>(null);

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
                onClick={() => setPreview(card)}
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
                  <Button variant="ghost" size="sm" onClick={() => setPreview(card)}>
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

      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.name} wide>
        {preview && (
          <div>
            {preview.previewUrl && (
              <img
                src={preview.previewUrl}
                alt={`${preview.name} — the invitation shown on three phone screens`}
                width={1920}
                height={1080}
                className="w-full rounded-card"
              />
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="type-caption text-muted">
                {preview.isPremium
                  ? "A premium design — needs a paid plan."
                  : "Included on every plan."}
              </p>
              <Button
                onClick={() => {
                  onSelect(preview);
                  setPreview(null);
                }}
              >
                {selectLabel} {preview.name}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
