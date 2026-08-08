"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Plus, Trash2 } from "lucide-react";
import { getTheme, suggestedReligions, themes, type ReligionTag } from "@/themes";
import { useTheme } from "@/design-system/ThemeProvider";
import {
  Button, Card, DatePicker, Divider, Input, PetalRain, PhotoUploader,
  Select, Stepper, Textarea, TimePicker, WaxSeal, type UploadedAsset,
} from "@/design-system/components";
import { eventTypeLabels, subEventPresets } from "@/lib/invite";
import { capture } from "@/lib/posthog/client";
import { EVENTS } from "@/lib/posthog/events";
import type { EventType, PlanRow } from "@/lib/supabase/types";
import { checkSlug, saveDraft, startCheckout } from "./actions";
import { ThemeChooser, draftToInviteView } from "./ThemeChooser";

/**
 * Theme comes second-to-last, deliberately.
 *
 * It used to come third, before the host had entered a single name — so the
 * gallery could only show sample cards, and the choice was made against
 * somebody else's wedding. Now the details exist by the time the question is
 * asked, and each theme is previewed with the host's own invitation in it.
 */
const STEPS = ["Occasion", "Region", "Details", "Link", "Photos", "Theme", "Publish"];

const STEP = {
  occasion: 0,
  region: 1,
  details: 2,
  link: 3,
  photos: 4,
  theme: 5,
  publish: 6,
} as const;

const countries = ["India", "Pakistan", "UAE", "USA", "United Kingdom", "Australia", "Canada", "Other"];
const traditions: { value: ReligionTag | "other"; label: string }[] = [
  { value: "hindu", label: "Hindu" },
  { value: "muslim", label: "Muslim" },
  { value: "sikh", label: "Sikh" },
  { value: "christian", label: "Christian" },
  { value: "interfaith", label: "Interfaith" },
  { value: "other", label: "Other" },
];

/** Occasions offered up front. `other` covers everything not listed. */
const occasions: EventType[] = [
  "wedding", "engagement", "reception", "anniversary", "birthday",
  "baby_shower", "naming", "housewarming", "graduation", "corporate", "other",
];

interface DraftSubEvent {
  key: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  dressCode: string;
}

interface Draft {
  eventType: EventType;
  country: string;
  tradition: string;
  themeId: string;
  hosts: { name: string; family: string }[];
  mainDate: string;
  city: string;
  story: string;
  hashtag: string;
  subEvents: DraftSubEvent[];
  slug: string;
  /** Consent to be featured in /showcase. Off unless explicitly ticked. */
  showcaseConsent: boolean;
  showcaseAnonymise: boolean;
}

const DRAFT_KEY = "amantrika:onboarding-draft";

const emptyDraft: Draft = {
  eventType: "wedding",
  country: "India",
  tradition: "hindu",
  themeId: "royal-maroon",
  hosts: [
    { name: "", family: "" },
    { name: "", family: "" },
  ],
  mainDate: "",
  city: "",
  story: "",
  hashtag: "",
  subEvents: [],
  slug: "",
  showcaseConsent: false,
  showcaseAnonymise: true,
};

function slugify(parts: string[]): string {
  const clean = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleaned = parts.map(clean).filter(Boolean);
  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return cleaned[0];
  return `${cleaned[0]}-and-${cleaned[1]}`;
}

/** A wedding gets "weds" in its link; everything else reads more naturally with "and". */
function defaultSlug(draft: Draft): string {
  const names = draft.hosts.map((h) => h.name);
  const base = slugify(names);
  if (draft.eventType === "wedding" && names.filter(Boolean).length === 2) {
    return base.replace("-and-", "-weds-");
  }
  return base;
}

export function OnboardingClient({ plans, isAgent }: { plans: PlanRow[]; isAgent: boolean }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [eventId, setEventId] = useState<string | null>(null);
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [slugState, setSlugState] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const [slugMessage, setSlugMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [planCode, setPlanCode] = useState(plans[0]?.code ?? "free");
  const selectedPlan = plans.find((p) => p.code === planCode) ?? null;
  // Display only. The price that is actually charged is computed server-side in
  // src/lib/pricing.ts and never read back from the browser.
  const isFreePlan = (selectedPlan?.price_inr ?? 0) === 0;
  const { setThemeId } = useTheme();

  // Local persistence covers a refresh before the first server save.
  useEffect(() => {
    let resumed = false;
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (saved) {
        setDraft({ ...emptyDraft, ...(JSON.parse(saved) as Partial<Draft>) });
        resumed = true;
      }
    } catch {
      // Corrupt draft: start fresh rather than trapping the user on a broken form.
    }
    capture(EVENTS.onboarding_started, { resumed_draft: resumed, is_agent: isAgent });
  }, [isAgent]);

  // One event per step reached — this is the drop-off funnel.
  useEffect(() => {
    capture(EVENTS.onboarding_step_viewed, {
      step_index: step,
      step_name: STEPS[step],
      event_type: draft.eventType,
    });
    // Only the step number should re-fire this, not every keystroke in the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const patch = useCallback((p: Partial<Draft>) => {
    setDraft((d) => {
      const next = { ...d, ...p };
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch {
        // Private browsing — the server save still covers us.
      }
      return next;
    });
  }, []);

  const theme = getTheme(draft.themeId);
  useEffect(() => setThemeId("royal-maroon"), [setThemeId]);

  const suggested = suggestedReligions(draft.country);
  const filteredThemes = useMemo(() => {
    const pref = suggested ?? null;
    const byTradition = themes.filter((t) => t.religionTag === draft.tradition);
    if (byTradition.length) {
      return [...byTradition, ...themes.filter((t) => t.religionTag !== draft.tradition)];
    }
    if (pref) {
      return [
        ...themes.filter((t) => pref.includes(t.religionTag)),
        ...themes.filter((t) => !pref.includes(t.religionTag)),
      ];
    }
    return themes;
  }, [draft.tradition, suggested]);

  const liveSlug = draft.slug || defaultSlug(draft);
  const isWedding = draft.eventType === "wedding";

  /**
   * The theme step renders the real invitation for whichever theme is being
   * looked at. Rebuilt whenever the draft or the uploaded photographs change,
   * so switching themes after editing a detail shows the edit.
   */
  const previewInvite = useCallback(
    (themeId: string) => draftToInviteView({ ...draft, slug: liveSlug }, themeId, assets),
    [draft, liveSlug, assets]
  );
  const hostLabel = (i: number) =>
    isWedding ? `Partner ${i + 1} name` : i === 0 ? "Host name" : `Co-host ${i} name`;

  /* ---------- slug availability, debounced ---------- */
  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const verifySlug = useCallback(
    (value: string) => {
      if (slugTimer.current) clearTimeout(slugTimer.current);
      if (!value) {
        setSlugState("idle");
        return;
      }
      setSlugState("checking");
      slugTimer.current = setTimeout(async () => {
        const result = await checkSlug(value, eventId ?? undefined);
        if (!result.ok) {
          setSlugState("invalid");
          setSlugMessage(result.error ?? "That link won't work.");
          return;
        }
        setSlugState(result.data?.available ? "ok" : "taken");
        setSlugMessage(result.data?.available ? "" : "Someone already has that link.");
        // Slug length only — never the slug itself, which contains real names.
        capture(EVENTS.invite_slug_checked, {
          available: Boolean(result.data?.available),
          slug_length: value.length,
        });
      }, 450);
    },
    [eventId]
  );

  useEffect(() => () => { if (slugTimer.current) clearTimeout(slugTimer.current); }, []);

  /**
   * Check the suggested link as soon as the step is reached.
   *
   * The field is pre-filled from the couple's names, and availability was only
   * checked on change or blur — so a host who was happy with the suggestion
   * never triggered a check, and "Continue" stayed disabled with no explanation
   * beyond "Pick a link to continue." A dead end on the one step nobody has a
   * reason to edit.
   */
  useEffect(() => {
    if (step === STEP.link) verifySlug(liveSlug);
    // Arriving at the step is the trigger; re-verifying on every keystroke is
    // already handled by the field's own onChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---------- presets ---------- */
  function addPresetEvents() {
    const preset = subEventPresets[draft.eventType] ?? [];
    patch({
      subEvents: preset.map((p) => ({
        key: p.key,
        name: p.name,
        date: draft.mainDate,
        time: "7:00 PM",
        venue: "",
        address: "",
        dressCode: "",
      })),
    });
  }

  function updateSubEvent(index: number, p: Partial<DraftSubEvent>) {
    const subEvents = [...draft.subEvents];
    subEvents[index] = { ...subEvents[index], ...p };
    patch({ subEvents });
  }

  /* ---------- persistence ---------- */
  async function persist(): Promise<boolean> {
    setSaving(true);
    setError(null);
    const result = await saveDraft({
      eventId: eventId ?? undefined,
      slug: liveSlug,
      eventType: draft.eventType,
      themeId: draft.themeId,
      title: draft.hosts.map((h) => h.name).filter(Boolean).join(" & "),
      hosts: draft.hosts
        .filter((h) => h.name.trim())
        .map((h) => ({ name: h.name, family: h.family || undefined })),
      hashtag: draft.hashtag || undefined,
      mainDate: draft.mainDate || undefined,
      city: draft.city || undefined,
      story: draft.story || undefined,
      showcaseConsent: draft.showcaseConsent,
      showcaseAnonymise: draft.showcaseAnonymise,
      subEvents: draft.subEvents
        .filter((s) => s.name.trim())
        .map((s) => ({
          key: s.key,
          name: s.name,
          date: s.date || undefined,
          time: s.time || undefined,
          venue: s.venue || undefined,
          address: s.address || undefined,
          dressCode: s.dressCode || undefined,
        })),
    });
    setSaving(false);

    if (!result.ok || !result.data) {
      setError(result.error ?? "Couldn't save your invitation.");
      return false;
    }
    setEventId(result.data.eventId);
    return true;
  }

  async function publish() {
    if (!eventId) {
      setError("Save your details first.");
      return;
    }
    setPublishing(true);
    setError(null);
    const result = await startCheckout({ eventId, planCode });

    if (!result.ok || !result.data) {
      setPublishing(false);
      setError(result.error ?? "Couldn't publish your invitation.");
      return;
    }

    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Nothing to clean up.
    }

    if (result.data.kind === "published") {
      setPublishing(false);
      setPublishedSlug(result.data.slug);
      return;
    }

    // Leaving for the processor. Stay in the loading state — the invitation is
    // not published yet and won't be until the webhook says the money arrived.
    window.location.href = result.data.checkoutUrl;
  }

  /* ---------- navigation ---------- */
  const canContinue = (() => {
    if (step === STEP.details) return draft.hosts.some((h) => h.name.trim());
    if (step === STEP.link) return slugState === "ok";
    return true;
  })();

  async function next() {
    // The draft is written to the database once the link is confirmed, so photo
    // uploads have an event to attach to. It is written again on leaving the
    // theme step, because the theme chosen there is what publishing will use.
    if (step === STEP.link || step === STEP.theme) {
      const saved = await persist();
      if (!saved) return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  const back = () => setStep((s) => Math.max(0, s - 1));

  /* ---------- published ---------- */
  if (publishedSlug) {
    const initials = draft.hosts.map((h) => h.name[0] ?? "").filter(Boolean).join("·") || "A";
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center">
        <PetalRain type="marigold" density={18} />
        <motion.div
          initial={{ scale: 2.2, opacity: 0, y: -60 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <WaxSeal monogram={initials} size={110} />
        </motion.div>
        <h1 className="mt-6 type-display-lg text-primary">It&apos;s live!</h1>
        <p className="mt-3 max-w-md type-body-lg text-muted">
          Your invitation is published at{" "}
          <span className="font-mono font-semibold text-primary">/invite/{publishedSlug}</span>
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard">
            <Button size="lg">Open your dashboard</Button>
          </Link>
          <Link href={`/invite/${publishedSlug}`}>
            <Button size="lg" variant="celebration">View your live invite</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <Link href="/" className="font-display text-2xl font-semibold text-primary">
          Amantrika
        </Link>
        {isAgent && <span className="type-caption">Creating on behalf of a client</span>}
      </header>

      <div className="mx-auto max-w-3xl px-4">
        <Stepper steps={STEPS} current={step} className="mb-10" />

        {/* OCCASION */}
        {step === STEP.occasion && (
          <Card variant="ornate" className="p-8">
            <h1 className="text-center type-h1 text-primary">What are we celebrating?</h1>
            <p className="mt-2 text-center type-body text-muted">
              Weddings are our home ground — but every occasion deserves a beautiful opening.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {occasions.map((value) => (
                <button
                  key={value}
                  onClick={() => {
                    patch({ eventType: value, subEvents: [] });
                    capture(EVENTS.onboarding_occasion_chosen, { event_type: value });
                  }}
                  className={`rounded-card border p-5 text-center transition-all cursor-pointer ${
                    draft.eventType === value
                      ? "ornate-border bg-accent/8 shadow-gold-glow"
                      : "border-ornate/40 hover:border-ornate"
                  }`}
                >
                  <span className="block font-display text-lg font-semibold text-primary">
                    {eventTypeLabels[value]}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* REGION & TRADITION */}
        {step === STEP.region && (
          <Card variant="ornate" className="p-8">
            <h1 className="text-center type-h1 text-primary">Where &amp; how are you celebrating?</h1>
            <div className="mx-auto mt-8 grid max-w-md gap-5">
              <Select
                label="Country"
                value={draft.country}
                onChange={(e) => patch({ country: e.target.value })}
                options={countries.map((c) => ({ value: c, label: c }))}
              />
              <Select
                label="Tradition"
                value={draft.tradition}
                onChange={(e) => patch({ tradition: e.target.value })}
                options={traditions.map((t) => ({ value: t.value, label: t.label }))}
              />
              {suggested && (
                <p className="type-caption">
                  Based on {draft.country}, we&apos;ll show {suggested.join("/")} themes first — but
                  every theme stays available.
                </p>
              )}
            </div>
            <div className="mt-8">
              <p className="mb-2 text-center type-overline">Live preview</p>
              <div className="flex h-14 overflow-hidden rounded-card border border-ornate/40">
                {filteredThemes.slice(0, 4).flatMap((t) =>
                  t.palette.slice(0, 2).map((hex) => (
                    <motion.span key={t.id + hex} layout className="flex-1" style={{ background: hex }} />
                  ))
                )}
              </div>
            </div>
          </Card>
        )}

        {/* THEME — asked last, previewed with the host's own details */}
        {step === STEP.theme && (
          <ThemeChooser
            themes={filteredThemes}
            selectedId={draft.themeId}
            invite={previewInvite}
            onSelect={(t) => {
              patch({ themeId: t.id });
              capture(EVENTS.onboarding_theme_chosen, {
                theme_id: t.id,
                religion_tag: t.religionTag,
                event_type: draft.eventType,
              });
            }}
          />
        )}

        {/* DETAILS */}
        {step === STEP.details && (
          <Card variant="ornate" className="p-8">
            <h1 className="text-center type-h1 text-primary">
              {isWedding ? "Tell us about you two" : "Tell us about the occasion"}
            </h1>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {draft.hosts.map((host, i) => (
                <div key={i} className="contents">
                  <Input
                    label={hostLabel(i)}
                    value={host.name}
                    onChange={(e) => {
                      const hosts = [...draft.hosts];
                      hosts[i] = { ...host, name: e.target.value };
                      patch({ hosts });
                    }}
                  />
                  <Input
                    label="Family name"
                    value={host.family}
                    onChange={(e) => {
                      const hosts = [...draft.hosts];
                      hosts[i] = { ...host, family: e.target.value };
                      patch({ hosts });
                    }}
                    placeholder="The Singh Family"
                  />
                </div>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => patch({ hosts: [...draft.hosts, { name: "", family: "" }] })}
              >
                <Plus className="size-4" /> Add another host
              </Button>
              {draft.hosts.length > 1 && (
                <Button size="sm" variant="ghost" onClick={() => patch({ hosts: draft.hosts.slice(0, -1) })}>
                  <Trash2 className="size-4" /> Remove last
                </Button>
              )}
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <DatePicker
                label="Main date"
                value={draft.mainDate}
                onChange={(e) => patch({ mainDate: e.target.value })}
              />
              <Input label="City" value={draft.city} onChange={(e) => patch({ city: e.target.value })} placeholder="Jaipur" />
              <Input
                label="Hashtag"
                value={draft.hashtag}
                onChange={(e) => patch({ hashtag: e.target.value })}
                placeholder="#SwarnilWedsPrachi"
                className="sm:col-span-2"
              />
            </div>
            <Textarea
              label="Your story"
              className="mt-5"
              value={draft.story}
              onChange={(e) => patch({ story: e.target.value })}
              rows={4}
              hint="Optional — leave it blank and we'll skip the story section."
            />

            <Divider variant="motif" motif="diya" className="my-8" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="type-h2 text-primary">Ceremonies &amp; events</h2>
              <div className="flex gap-2">
                {(subEventPresets[draft.eventType]?.length ?? 0) > 0 && (
                  <Button size="sm" variant="ghost" onClick={addPresetEvents}>
                    Use {eventTypeLabels[draft.eventType].toLowerCase()} preset
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    patch({
                      subEvents: [
                        ...draft.subEvents,
                        {
                          key: `event-${draft.subEvents.length + 1}`,
                          name: theme.eventVocabulary[draft.subEvents.length % theme.eventVocabulary.length],
                          date: draft.mainDate,
                          time: "7:00 PM",
                          venue: "",
                          address: "",
                          dressCode: "",
                        },
                      ],
                    })
                  }
                >
                  <Plus className="size-4" /> Add event
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {draft.subEvents.length === 0 && (
                <p className="type-caption italic">
                  No events yet — add them one at a time, or start from the preset.
                </p>
              )}
              {draft.subEvents.map((ev, i) => (
                <div key={ev.key} className="grid gap-3 rounded-card border border-ornate/40 p-4 sm:grid-cols-5">
                  <Input label="Event" value={ev.name} onChange={(e) => updateSubEvent(i, { name: e.target.value })} />
                  <DatePicker label="Date" value={ev.date} onChange={(e) => updateSubEvent(i, { date: e.target.value })} />
                  <TimePicker label="Time" value={ev.time} onChange={(e) => updateSubEvent(i, { time: e.target.value })} />
                  <Input label="Venue" value={ev.venue} onChange={(e) => updateSubEvent(i, { venue: e.target.value })} />
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${ev.name}`}
                      onClick={() => patch({ subEvents: draft.subEvents.filter((x) => x.key !== ev.key) })}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <Input
                    label="Address"
                    value={ev.address}
                    onChange={(e) => updateSubEvent(i, { address: e.target.value })}
                    className="sm:col-span-3"
                  />
                  <Input
                    label="Dress code"
                    value={ev.dressCode}
                    onChange={(e) => updateSubEvent(i, { dressCode: e.target.value })}
                    className="sm:col-span-2"
                  />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* PERMALINK */}
        {step === STEP.link && (
          <Card variant="ornate" className="p-8 text-center">
            <h1 className="type-h1 text-primary">Your forever link</h1>
            <p className="mt-2 type-body text-muted">One link for every guest, every event, every blessing.</p>
            <div className="mx-auto mt-8 flex max-w-lg items-center gap-2 rounded-soft border border-ornate/60 bg-raised px-4 py-3">
              <span className="text-muted">/invite/</span>
              <input
                aria-label="Invite permalink"
                value={liveSlug}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                  patch({ slug: value });
                  verifySlug(value);
                }}
                onBlur={() => verifySlug(liveSlug)}
                className="min-w-0 flex-1 bg-transparent font-mono font-semibold text-primary outline-none"
                placeholder="swarnil-weds-prachi"
              />
            </div>
            <p className="mt-3 min-h-6 text-sm font-semibold">
              {slugState === "checking" && <span className="text-muted">Checking availability…</span>}
              {slugState === "ok" && (
                <span className="inline-flex items-center gap-1 text-success">
                  <Check className="size-4" /> available!
                </span>
              )}
              {(slugState === "taken" || slugState === "invalid") && (
                <span className="text-red-600 dark:text-red-400">{slugMessage}</span>
              )}
              {slugState === "idle" && <span className="text-muted">Pick a link to continue.</span>}
            </p>
          </Card>
        )}

        {/* PHOTOS */}
        {step === STEP.photos && (
          <Card variant="ornate" className="p-8">
            <h1 className="text-center type-h1 text-primary">Add your photographs</h1>
            <p className="mt-2 text-center type-body text-muted">
              These appear in your gallery and story sections. You can always add more later.
            </p>
            {eventId ? (
              <PhotoUploader
                eventId={eventId}
                assets={assets}
                onChange={setAssets}
                className="mt-8"
              />
            ) : (
              <p className="mt-8 text-center type-caption">
                Confirm your link first — we need somewhere to file these.
              </p>
            )}

            <Divider variant="motif" motif="marigold" className="my-8" />

            {/*
              Consent lives here, after the host has seen exactly which photos
              they added — asking before they know what they'd be sharing would
              not be informed consent. Unticked by default, never pre-ticked.
            */}
            <fieldset>
              <legend className="type-h2 text-primary">Showcase (optional)</legend>
              <label className="mt-4 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={draft.showcaseConsent}
                  onChange={(e) => patch({ showcaseConsent: e.target.checked })}
                  className="mt-1 size-4 shrink-0 accent-[var(--color-primary)]"
                />
                <span className="type-body text-muted">
                  Can we feature your invitation in our public gallery? We&apos;ll create a copy
                  with your address, phone numbers, and payment details removed. You can withdraw
                  this at any time.
                </span>
              </label>

              {draft.showcaseConsent && (
                <label className="mt-4 flex cursor-pointer items-start gap-3 border-l-2 border-ornate/40 pl-4">
                  <input
                    type="checkbox"
                    checked={draft.showcaseAnonymise}
                    onChange={(e) => patch({ showcaseAnonymise: e.target.checked })}
                    className="mt-1 size-4 shrink-0 accent-[var(--color-primary)]"
                  />
                  <span className="type-body text-muted">
                    Use first names only. Leave this ticked if you&apos;d rather your surnames
                    weren&apos;t shown.
                  </span>
                </label>
              )}

              <p className="mt-4 type-caption">
                Ticking this makes your invitation <em>eligible</em> — we still review before
                anything is published, and we never link to your real invitation.{" "}
                <Link href="/showcase" target="_blank" className="text-primary underline underline-offset-4">
                  See the gallery
                </Link>
              </p>
            </fieldset>
          </Card>
        )}

        {/* PLAN + PAYMENT */}
        {step === STEP.publish && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-4">
              {plans.map((plan) => (
                <button
                  key={plan.code}
                  onClick={() => {
                    setPlanCode(plan.code);
                    capture(EVENTS.plan_selected, {
                      plan: plan.code,
                      amount_inr: plan.price_inr,
                    });
                  }}
                  className={`rounded-card border p-6 text-left transition-all cursor-pointer ${
                    planCode === plan.code
                      ? "ornate-border bg-accent/8 shadow-gold-glow"
                      : "border-ornate/40 hover:border-ornate"
                  }`}
                >
                  <p className="type-overline">{plan.name}</p>
                  <p className="mt-2 font-display text-4xl font-semibold text-primary">
                    {plan.price_inr === 0 ? "Free" : `₹${plan.price_inr.toLocaleString("en-IN")}`}
                  </p>
                  {plan.description && <p className="mt-1 type-caption">{plan.description}</p>}
                  <ul className="mt-4 space-y-1.5 text-sm">
                    {(plan.features ?? []).map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="size-4 shrink-0 text-success" /> {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <Card className="h-fit p-8">
              <p className="type-overline mb-4">Order summary</p>
              {selectedPlan && (
                <dl className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between">
                    <dt className="text-sm">{selectedPlan.name}</dt>
                    <dd className="font-display text-2xl font-semibold text-primary">
                      {selectedPlan.price_inr === 0
                        ? "Free"
                        : `₹${selectedPlan.price_inr.toLocaleString("en-IN")}`}
                    </dd>
                  </div>
                  {selectedPlan.description && (
                    <p className="type-caption">{selectedPlan.description}</p>
                  )}
                </dl>
              )}
              <Button
                size="lg"
                loading={publishing}
                onClick={publish}
                className="mt-6 w-full"
                variant="celebration"
              >
                {isFreePlan
                  ? publishing
                    ? "Publishing…"
                    : "Publish invitation"
                  : publishing
                    ? "Opening checkout…"
                    : "Continue to payment"}
              </Button>
              <p className="mt-3 text-center type-caption">
                {isFreePlan
                  ? "Your invitation publishes straight away, with a small Amantrika watermark."
                  : "You'll pay on our processor's secure page. Your invitation goes live the moment the payment is confirmed."}
              </p>
            </Card>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-6 text-center type-caption text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {/* nav */}
        <div className="mt-10 flex justify-between">
          <Button variant="ghost" onClick={back} disabled={step === 0}>
            ← Back
          </Button>
          {step < STEPS.length - 1 && (
            <Button onClick={next} disabled={!canContinue} loading={saving}>
              Continue →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
