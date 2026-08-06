"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Plus, Trash2 } from "lucide-react";
import { couples, type CoupleData, type WeddingEvent } from "@/data/couples";
import { store } from "@/lib/store";
import { getTheme, suggestedReligions, themes, type ReligionTag } from "@/themes";
import { useTheme } from "@/design-system/ThemeProvider";
import { motifs } from "@/design-system/motifs";
import {
  Button, Card, CoupleMonogram, DatePicker, Divider, Input, Modal, PetalRain, Select, Stepper,
  Textarea, TimePicker, WaxSeal,
} from "@/design-system/components";

const STEPS = ["Side", "Region", "Theme", "Details", "Link", "Payment"];

const countries = ["India", "Pakistan", "UAE", "USA", "United Kingdom", "Australia", "Canada", "Other"];
const traditions: { value: ReligionTag | "other"; label: string }[] = [
  { value: "hindu", label: "Hindu" },
  { value: "muslim", label: "Muslim" },
  { value: "sikh", label: "Sikh" },
  { value: "christian", label: "Christian" },
  { value: "interfaith", label: "Interfaith" },
  { value: "other", label: "Other" },
];

interface Draft {
  side: "groom" | "bride" | "together";
  country: string;
  tradition: string;
  themeId: string;
  p1Name: string; p1Family: string;
  p2Name: string; p2Family: string;
  mainDate: string;
  city: string;
  story: string;
  hashtag: string;
  events: WeddingEvent[];
  slug: string;
}

const demo = couples[0];
const defaultDraft: Draft = {
  side: "together",
  country: "India",
  tradition: "hindu",
  themeId: "royal-maroon",
  p1Name: "", p1Family: "",
  p2Name: "", p2Family: "",
  mainDate: "2026-11-24",
  city: "",
  story: demo.story,
  hashtag: "",
  events: [],
  slug: "",
};

function slugify(a: string, b: string) {
  const clean = (s: string) => s.trim().toLowerCase().replace(/[^a-z]/g, "");
  return a && b ? `${clean(a)}-weds-${clean(b)}` : "";
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);
  const [slugState, setSlugState] = useState<"idle" | "checking" | "ok">("idle");
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const { setThemeId } = useTheme();

  useEffect(() => {
    const saved = store.getDraft() as unknown as Draft | null;
    if (saved?.p1Name !== undefined) setDraft({ ...defaultDraft, ...saved });
  }, []);

  const patch = (p: Partial<Draft>) =>
    setDraft((d) => {
      const next = { ...d, ...p };
      store.saveDraft(next as unknown as Partial<CoupleData>);
      return next;
    });

  const theme = getTheme(draft.themeId);
  useEffect(() => setThemeId("royal-maroon"), [setThemeId]);

  const suggested = suggestedReligions(draft.country);
  const filteredThemes = useMemo(() => {
    const pref = suggested ?? null;
    const byTradition = themes.filter((t) => t.religionTag === draft.tradition);
    if (byTradition.length) return [...byTradition, ...themes.filter((t) => t.religionTag !== draft.tradition)];
    if (pref) return [...themes.filter((t) => pref.includes(t.religionTag)), ...themes.filter((t) => !pref.includes(t.religionTag))];
    return themes;
  }, [draft.tradition, suggested]);

  const fillDemo = () => {
    patch({
      p1Name: demo.partner1.name, p1Family: demo.partner1.family,
      p2Name: demo.partner2.name, p2Family: demo.partner2.family,
      city: demo.city, hashtag: demo.hashtag, story: demo.story,
      events: demo.events, mainDate: "2026-11-24",
      slug: demo.slug, themeId: demo.themeId,
    });
  };

  const checkSlug = (slug: string) => {
    patch({ slug });
    setSlugState("checking");
    setTimeout(() => setSlugState("ok"), 600);
  };

  const pay = () => {
    setPaying(true);
    setTimeout(() => {
      const invite: CoupleData = {
        slug: draft.slug || slugify(draft.p1Name, draft.p2Name) || demo.slug,
        themeId: draft.themeId,
        side: draft.side,
        partner1: { name: draft.p1Name || demo.partner1.name, family: draft.p1Family || demo.partner1.family },
        partner2: { name: draft.p2Name || demo.partner2.name, family: draft.p2Family || demo.partner2.family },
        hashtag: draft.hashtag || demo.hashtag,
        mainDate: `${draft.mainDate}T19:00:00`,
        city: draft.city || demo.city,
        story: draft.story,
        storyMoments: demo.storyMoments,
        photos: demo.photos,
        events: draft.events.length ? draft.events : demo.events,
        hotels: demo.hotels,
      };
      store.publishInvite(invite);
      setPaying(false);
      setPaid(true);
    }, 1500);
  };

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const liveSlug = draft.slug || slugify(draft.p1Name, draft.p2Name);

  if (paid) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center">
        <PetalRain type="marigold" density={18} />
        <motion.div initial={{ scale: 2.2, opacity: 0, y: -60 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          <WaxSeal monogram={`${(draft.p1Name || "S")[0]}·${(draft.p2Name || "P")[0]}`} size={110} />
        </motion.div>
        <h1 className="mt-6 type-display-lg text-primary">It&apos;s official!</h1>
        <p className="mt-3 max-w-md type-body-lg text-muted">
          Your invitation is live at <span className="font-mono font-semibold text-primary">amantrika.com/{liveSlug}</span>
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/admin"><Button size="lg">Open your admin panel</Button></Link>
          <Link href={`/invite/${liveSlug}`}><Button size="lg" variant="celebration">View your live invite</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <Link href="/" className="font-display text-2xl font-semibold text-primary">Amantrika</Link>
        <Button variant="ghost" size="sm" onClick={fillDemo}>Continue as demo couple</Button>
      </header>

      <div className="mx-auto max-w-3xl px-4">
        <Stepper steps={STEPS} current={step} className="mb-10" />

        {/* STEP 1 — side */}
        {step === 0 && (
          <Card variant="ornate" className="p-8">
            <h1 className="text-center type-h1 text-primary">Who&apos;s creating this invite?</h1>
            <p className="mt-2 text-center type-body text-muted">This only shapes a few friendly touches — nothing is locked.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {([["groom", "Groom's side", "We'll ask about him first"], ["bride", "Bride's side", "We'll ask about her first"]] as const).map(([v, label, sub]) => (
                <button
                  key={v}
                  onClick={() => patch({ side: v })}
                  className={`rounded-card border p-8 text-center transition-all cursor-pointer ${draft.side === v ? "ornate-border bg-accent/8 shadow-gold-glow" : "border-ornate/40 hover:border-ornate"}`}
                >
                  <span className="block font-display text-2xl font-semibold text-primary">{label}</span>
                  <span className="type-caption">{sub}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => patch({ side: "together" })}
              className={`mx-auto mt-4 block rounded-pill px-5 py-2 text-sm font-semibold cursor-pointer ${draft.side === "together" ? "bg-primary text-bg" : "text-muted hover:text-foreground"}`}
            >
              We&apos;re doing this together ♡
            </button>
          </Card>
        )}

        {/* STEP 2 — region & tradition */}
        {step === 1 && (
          <Card variant="ornate" className="p-8">
            <h1 className="text-center type-h1 text-primary">Where &amp; how are you celebrating?</h1>
            <div className="mx-auto mt-8 grid max-w-md gap-5">
              <Select label="Country" value={draft.country} onChange={(e) => patch({ country: e.target.value })} options={countries.map((c) => ({ value: c, label: c }))} />
              <Select label="Wedding tradition" value={draft.tradition} onChange={(e) => patch({ tradition: e.target.value })} options={traditions.map((t) => ({ value: t.value, label: t.label }))} />
              {suggested && (
                <p className="type-caption">
                  Based on {draft.country}, we&apos;ll show {suggested.join("/")} themes first — but every theme stays available.
                </p>
              )}
            </div>
            <div className="mt-8">
              <p className="mb-2 text-center type-overline">Live preview</p>
              <div className="flex h-14 overflow-hidden rounded-card border border-ornate/40">
                {filteredThemes.slice(0, 4).flatMap((t) => t.palette.slice(0, 2).map((hex) => (
                  <motion.span key={t.id + hex} layout className="flex-1" style={{ background: hex }} />
                )))}
              </div>
            </div>
          </Card>
        )}

        {/* STEP 3 — theme gallery */}
        {step === 2 && (
          <div>
            <h1 className="text-center type-h1 text-primary">Choose your theme</h1>
            <p className="mt-2 text-center type-body text-muted">Filtered for you — browse them all, always.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {filteredThemes.map((t) => {
                const Corner = motifs[t.motifSet.corner];
                const active = draft.themeId === t.id;
                return (
                  <button key={t.id} onClick={() => setPreviewTheme(t.id)} className={`rounded-card border p-5 text-left transition-all cursor-pointer ${active ? "ornate-border shadow-gold-glow" : "border-ornate/40 hover:border-ornate"}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xl font-semibold text-primary">{t.name}</span>
                      <Corner className="size-6 text-accent" />
                    </div>
                    <p className="type-caption">{t.religionTag} · {t.moodTag} · {t.regionTag}</p>
                    <div className="mt-3 flex h-6 overflow-hidden rounded-soft">
                      {t.palette.map((hex) => <span key={hex} className="flex-1" style={{ background: hex }} />)}
                    </div>
                    {active && <p className="mt-2 flex items-center gap-1 text-sm font-bold text-success"><Check className="size-4" /> Selected</p>}
                  </button>
                );
              })}
            </div>
            <Modal open={!!previewTheme} onClose={() => setPreviewTheme(null)} title={previewTheme ? getTheme(previewTheme).name : ""} wide>
              {previewTheme && (() => {
                const t = getTheme(previewTheme);
                return (
                  <div>
                    <div className="rounded-card p-8 text-center" style={{ background: t.palette[2], color: t.palette[3] }}>
                      <CoupleMonogram initials={["S", "P"]} ring={t.monogramRing} className="mx-auto size-20" />
                      <p className={`mt-3 text-xl ${t.greetingScript === "arabic" ? "font-arabic" : t.greetingScript === "devanagari" ? "font-deva" : "font-display italic"}`} style={{ color: t.palette[0] }} dir={t.greetingScript === "arabic" ? "rtl" : undefined}>{t.greetingCopy}</p>
                      <p className="mt-2 font-display text-4xl font-semibold" style={{ color: t.palette[0] }}>Swarnil weds Prachi</p>
                      <p className="mt-3 text-sm opacity-80">{t.eventVocabulary.join(" · ")}</p>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setPreviewTheme(null)}>Keep browsing</Button>
                      <Button onClick={() => { patch({ themeId: t.id }); setPreviewTheme(null); }}>Choose this theme</Button>
                    </div>
                  </div>
                );
              })()}
            </Modal>
          </div>
        )}

        {/* STEP 4 — details */}
        {step === 3 && (
          <Card variant="ornate" className="p-8">
            <h1 className="text-center type-h1 text-primary">Tell us about you two</h1>
            <p className="mt-1 text-center type-caption">
              {draft.side === "bride" ? "Tell us about her first" : draft.side === "groom" ? "Tell us about him first" : "In any order you like"}
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <Input label={draft.side === "bride" ? "Bride's name" : "Partner 1 name"} value={draft.p1Name} onChange={(e) => patch({ p1Name: e.target.value })} placeholder="Swarnil" />
              <Input label="Family name" value={draft.p1Family} onChange={(e) => patch({ p1Family: e.target.value })} placeholder="The Singh Family" />
              <Input label={draft.side === "bride" ? "Groom's name" : "Partner 2 name"} value={draft.p2Name} onChange={(e) => patch({ p2Name: e.target.value })} placeholder="Prachi" />
              <Input label="Family name" value={draft.p2Family} onChange={(e) => patch({ p2Family: e.target.value })} placeholder="The Sharma Family" />
              <DatePicker label="Main ceremony date" value={draft.mainDate} onChange={(e) => patch({ mainDate: e.target.value })} />
              <Input label="City" value={draft.city} onChange={(e) => patch({ city: e.target.value })} placeholder="Jaipur" />
              <Input label="Hashtag" value={draft.hashtag} onChange={(e) => patch({ hashtag: e.target.value })} placeholder="#SwarnilWedsPrachi" className="sm:col-span-2" />
            </div>
            <Textarea label="Your story" className="mt-5" value={draft.story} onChange={(e) => patch({ story: e.target.value })} rows={4} />

            <Divider variant="motif" motif="diya" className="my-8" />
            <div className="flex items-center justify-between">
              <h2 className="type-h2 text-primary">Events</h2>
              <Button
                size="sm" variant="secondary"
                onClick={() => patch({ events: [...draft.events, { id: `e${Date.now()}`, name: theme.eventVocabulary[draft.events.length % theme.eventVocabulary.length], date: draft.mainDate, time: "7:00 PM", venue: "", address: "" }] })}
              >
                <Plus className="size-4" /> Add event
              </Button>
            </div>
            <p className="type-caption">Suggestions from your theme: {theme.eventVocabulary.join(", ")}</p>
            <div className="mt-4 flex flex-col gap-4">
              {draft.events.length === 0 && <p className="type-caption italic">No events yet — &quot;Continue as demo couple&quot; prefills a full schedule, or add your own.</p>}
              {draft.events.map((ev, i) => (
                <div key={ev.id} className="grid gap-3 rounded-card border border-ornate/40 p-4 sm:grid-cols-5">
                  <Input label="Event" value={ev.name} onChange={(e) => { const events = [...draft.events]; events[i] = { ...ev, name: e.target.value }; patch({ events }); }} />
                  <DatePicker label="Date" value={ev.date} onChange={(e) => { const events = [...draft.events]; events[i] = { ...ev, date: e.target.value }; patch({ events }); }} />
                  <TimePicker label="Time" value={ev.time} onChange={(e) => { const events = [...draft.events]; events[i] = { ...ev, time: e.target.value }; patch({ events }); }} />
                  <Input label="Venue" value={ev.venue} onChange={(e) => { const events = [...draft.events]; events[i] = { ...ev, venue: e.target.value }; patch({ events }); }} />
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" aria-label={`Remove ${ev.name}`} onClick={() => patch({ events: draft.events.filter((x) => x.id !== ev.id) })}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Divider variant="motif" motif="marigold" className="my-8" />
            <h2 className="type-h2 text-primary">Photos</h2>
            <p className="type-caption">Demo placeholders stand in as your &quot;uploads&quot;.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {demo.photos.slice(0, 5).map((seed) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={seed} src={`https://picsum.photos/seed/${seed}/96/96`} alt="Uploaded placeholder" className="size-20 rounded-soft border border-ornate/50 object-cover" />
              ))}
              <span className="flex size-20 items-center justify-center rounded-soft border border-dashed border-ornate/60 text-muted"><Plus className="size-5" /></span>
            </div>
          </Card>
        )}

        {/* STEP 5 — permalink */}
        {step === 4 && (
          <Card variant="ornate" className="p-8 text-center">
            <h1 className="type-h1 text-primary">Your forever link</h1>
            <p className="mt-2 type-body text-muted">One link for every guest, every event, every blessing.</p>
            <div className="mx-auto mt-8 flex max-w-lg items-center gap-2 rounded-soft border border-ornate/60 bg-raised px-4 py-3">
              <span className="text-muted">amantrika.com/</span>
              <input
                aria-label="Invite permalink"
                value={liveSlug}
                onChange={(e) => checkSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className="min-w-0 flex-1 bg-transparent font-mono font-semibold text-primary outline-none"
                placeholder="swarnil-weds-prachi"
              />
            </div>
            <p className="mt-3 h-6 text-sm font-semibold">
              {slugState === "checking" && <span className="text-muted">Checking availability…</span>}
              {slugState === "ok" && <span className="inline-flex items-center gap-1 text-success"><Check className="size-4" /> available!</span>}
            </p>
          </Card>
        )}

        {/* STEP 6 — fake payment */}
        {step === 5 && (
          <div className="grid gap-6 sm:grid-cols-2">
            <Card variant="ornate" className="p-8 text-center">
              <p className="type-overline">Amantrika Forever</p>
              <p className="mt-3 font-display text-5xl font-semibold text-primary">₹ ——</p>
              <p className="type-caption">one-time · demo pricing</p>
              <ul className="mx-auto mt-5 max-w-56 space-y-2 text-left text-sm">
                {["Animated envelope invite", "All 8 themes, switch anytime", "RSVP & guest analytics", "Blessings wall", "Your forever link"].map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="size-4 shrink-0 text-success" /> {f}</li>
                ))}
              </ul>
            </Card>
            <Card className="p-8">
              <p className="type-overline mb-4">Payment (demo)</p>
              <div className="flex flex-col gap-4 opacity-60">
                <Input label="Card number" disabled placeholder="4242 4242 4242 4242" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Expiry" disabled placeholder="12/29" />
                  <Input label="CVV" disabled placeholder="•••" />
                </div>
              </div>
              <Button size="lg" loading={paying} onClick={pay} className="mt-6 w-full" variant="celebration">
                {paying ? "Blessing your card…" : "Pay (demo)"}
              </Button>
              <p className="mt-3 text-center type-caption">No money moves. It always succeeds. 🎉</p>
            </Card>
          </div>
        )}

        {/* nav */}
        <div className="mt-10 flex justify-between">
          <Button variant="ghost" onClick={back} disabled={step === 0}>← Back</Button>
          {step < STEPS.length - 1 && <Button onClick={next}>Continue →</Button>}
        </div>
      </div>
    </div>
  );
}
