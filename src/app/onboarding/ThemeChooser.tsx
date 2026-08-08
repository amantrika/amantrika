"use client";

import { useMemo, useState } from "react";
import { Check, Lock, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/design-system/components";
import { motifs } from "@/design-system/motifs";
import { InviteBody } from "@/components/invite/InviteBody";
import { assetUrl, type InviteView } from "@/lib/invites/invite";
import type { Theme } from "@/themes";
import type { EventType } from "@/lib/supabase/types";
import type { UploadedAsset } from "@/design-system/components";

/**
 * The last step before paying: pick a theme by looking at your own invitation
 * in it.
 *
 * The preview is `InviteBody` — the very component the guest page renders —
 * scoped inside a `[data-theme]` element with inert submit handlers. A chooser
 * that draws its own approximation of an invitation is a chooser that
 * eventually shows something the host will not receive.
 */

export interface ThemeDraft {
  eventType: EventType;
  hosts: { name: string; family: string }[];
  mainDate: string;
  city: string;
  story: string;
  hashtag: string;
  slug: string;
  subEvents: {
    key: string;
    name: string;
    date: string;
    time: string;
    venue: string;
    address: string;
    dressCode: string;
  }[];
}

/** Turns the in-progress form into the same view model the guest page renders. */
export function draftToInviteView(
  draft: ThemeDraft,
  themeId: string,
  assets: UploadedAsset[],
  /**
   * The plan being previewed. It decides which sections the invitation has —
   * a free plan has no RSVP — so the preview must be told, or it shows a page
   * the host will not receive. Defaults to premium for callers that are
   * demonstrating a theme rather than someone's actual purchase.
   */
  planCode = "premium"
): InviteView {
  const hosts = draft.hosts
    .filter((h) => h.name.trim())
    .map((h) => ({ name: h.name.trim(), family: h.family.trim() || undefined }));

  return {
    id: null,
    // Drives which sections the preview renders. The watermark is not decided
    // here — `MadeWithBadge` is rendered by the guest page, not by InviteBody —
    // so a free preview is honest about its sections without being defaced.
    planCode,
    slug: draft.slug || "preview",
    eventType: draft.eventType,
    themeId,
    title: hosts.map((h) => h.name).join(" & "),
    // A host who has not typed names yet still deserves a preview that shows
    // the shape of the page rather than a blank one.
    hosts: hosts.length ? hosts : [{ name: "Your name" }, { name: "Their name" }],
    hashtag: draft.hashtag,
    mainDate: draft.mainDate || new Date().toISOString(),
    city: draft.city,
    story: draft.story,
    storyMoments: [],
    photos: assets.map((a) => ({
      id: a.id,
      url: assetUrl(a.storagePath),
      caption: a.caption ?? undefined,
    })),
    events: draft.subEvents
      .filter((s) => s.name.trim())
      .map((s) => ({
        id: s.key,
        name: s.name,
        date: s.date,
        time: s.time,
        venue: s.venue,
        address: s.address,
        dressCode: s.dressCode || undefined,
      })),
    hotels: [],
    settings: {},
    isDemo: false,
  };
}

/** One-line description of what the theme does to the *page*, not the palette. */
function structureSummary(theme: Theme): string {
  const { layout } = theme;
  const hero = layout.hero.replace(/-/g, " ");
  return `${hero} opening · ${layout.order.length} sections · ${layout.rhythm} spacing · ${layout.ornament} ornament`;
}

export function ThemeChooser({
  themes,
  selectedId,
  onSelect,
  invite,
  premiumThemeIds,
}: {
  /** Already ordered by relevance to the host's tradition and country. */
  themes: Theme[];
  selectedId: string;
  onSelect: (theme: Theme) => void;
  invite: (themeId: string) => InviteView;
  /**
   * Premium themes, badged as such.
   *
   * Deliberately *not* disabled. The plan is chosen on the next step, so at
   * this point nobody has declined to pay — locking a theme here would refuse
   * a sale before it was offered. The badge sets the expectation, the plan step
   * repeats it, and `startCheckout` is what actually enforces it.
   */
  premiumThemeIds?: ReadonlySet<string>;
}) {
  const [previewId, setPreviewId] = useState(selectedId);
  const [width, setWidth] = useState<"phone" | "desktop">("phone");

  const premium = premiumThemeIds ?? new Set<string>();
  const preview = themes.find((t) => t.id === previewId) ?? themes[0];
  const previewInvite = useMemo(() => invite(preview.id), [invite, preview.id]);

  return (
    <div>
      <h1 className="text-center type-h1 text-primary">Now choose how it looks</h1>
      <p className="mx-auto mt-2 max-w-xl text-center type-body text-muted">
        Every theme is a different layout, not a different colour scheme — the sections, their
        order and their spacing all change. This is your invitation, with your details, in each one.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* ---- the list ---- */}
        <div className="flex gap-3 overflow-x-auto pb-2 lg:max-h-[46rem] lg:flex-col lg:overflow-y-auto lg:pr-2">
          {themes.map((t) => {
            const Corner = motifs[t.motifSet.corner];
            const chosen = t.id === selectedId;
            const showing = t.id === preview.id;
            return (
              <button
                key={t.id}
                onClick={() => setPreviewId(t.id)}
                aria-pressed={showing}
                className={`w-56 shrink-0 cursor-pointer rounded-card border p-4 text-left transition-all lg:w-auto ${
                  showing ? "ornate-border shadow-gold-glow" : "border-ornate/40 hover:border-ornate"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg font-semibold text-primary">{t.name}</span>
                  <Corner className="size-5 shrink-0 text-accent" />
                </div>
                <p className="mt-0.5 type-caption">{structureSummary(t)}</p>
                <div className="mt-3 flex h-5 overflow-hidden rounded-soft">
                  {t.palette.map((hex) => (
                    <span key={hex} className="flex-1" style={{ background: hex }} />
                  ))}
                </div>
                {chosen && (
                  <p className="mt-2 flex items-center gap-1 text-sm font-bold text-success">
                    <Check className="size-4" /> Chosen
                  </p>
                )}
                {!chosen && premium.has(t.id) && (
                  <p className="mt-2 flex items-center gap-1 type-caption font-semibold text-accent">
                    <Lock className="size-3.5" /> Premium theme
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* ---- the preview ---- */}
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="type-overline">{preview.name} — your invitation</p>
            <div className="flex items-center gap-1 rounded-pill border border-ornate/40 p-1">
              <WidthButton
                active={width === "phone"}
                onClick={() => setWidth("phone")}
                icon={<Smartphone className="size-4" />}
                label="Phone"
              />
              <WidthButton
                active={width === "desktop"}
                onClick={() => setWidth("desktop")}
                icon={<Monitor className="size-4" />}
                label="Desktop"
              />
            </div>
          </div>

          {/*
            `data-theme` scopes the whole token set to this element, so the
            preview restyles without touching the surrounding onboarding
            chrome. `--hero-min-height` stops the hero claiming a full viewport
            inside a box that is 40rem tall.
          */}
          <div
            data-theme={preview.id}
            data-mood={preview.moodTag}
            className="mx-auto overflow-y-auto overflow-x-hidden rounded-card border border-ornate/40 bg-bg"
            style={{
              maxWidth: width === "phone" ? "26rem" : "100%",
              height: "40rem",
              ["--hero-min-height" as string]: "26rem",
            }}
          >
            <InviteBody
              invite={previewInvite}
              theme={preview}
              blessings={[]}
              onOpenPhoto={() => {}}
              // The preview must never write. Both handlers resolve to a
              // refusal rather than silently pretending to have submitted.
              onRsvp={async () => ({ ok: false, error: "This is a preview." })}
              onBlessing={async () => ({ ok: false, error: "This is a preview." })}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            {preview.id === selectedId ? (
              <p className="flex items-center gap-1.5 type-body font-semibold text-success">
                <Check className="size-4" /> This is your theme
              </p>
            ) : (
              <div className="flex flex-wrap items-center justify-end gap-3">
                {premium.has(preview.id) && (
                  // Said before the choice, not after it. The plan step repeats
                  // this, and startCheckout enforces it.
                  <p className="flex items-center gap-1.5 type-caption text-muted">
                    <Lock className="size-3.5 text-accent" />
                    Premium theme — needs a paid plan
                  </p>
                )}
                <Button onClick={() => onSelect(preview)}>Use {preview.name}</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WidthButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-pill px-3 py-1.5 text-sm font-semibold transition-colors ${
        active ? "bg-primary-soft text-primary" : "text-muted hover:text-primary"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
