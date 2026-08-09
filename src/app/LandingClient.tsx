"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3, Check, ImageUp, Link2, MessageSquareHeart, Palette, Users, Wand2,
} from "lucide-react";
import { themes } from "@/themes";
import { Badge, Button, Card, Divider, Envelope } from "@/design-system/components";
import { fadeUpStagger, staggerContainer } from "@/design-system/motion/presets";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { ThemePreviewCard } from "@/components/site/ThemePreviewCard";
import { AthemeGallery } from "@/components/site/AthemeGallery";
import type { AthemeCard } from "@/lib/themes/atheme";
import {
  HomeFaq,
  LatestBlogs,
  ReadyToCreate,
  WhatWeOffer,
  WhyChooseUs,
  type HomePostSummary,
} from "@/components/site/HomeSections";
import { eventTypeLabels } from "@/lib/invites/invite";
import type { EventType, PlanRow } from "@/lib/supabase/types";

/** The build flow, mirroring the real onboarding steps. */
const makingSteps = [
  {
    icon: Wand2,
    title: "Pick the occasion",
    text: "Wedding, engagement, birthday, housewarming, corporate — the builder reshapes itself around what you're celebrating.",
  },
  {
    icon: Palette,
    title: "Choose a theme",
    text: "Eight ceremonial themes across Hindu, Muslim, Sikh and Christian traditions — each with its own motifs, script and petals.",
  },
  {
    icon: Users,
    title: "Add your people & schedule",
    text: "Hosts, families, and every ceremony with its own venue, time and dress code. Your card assembles itself as you type.",
  },
  {
    icon: ImageUp,
    title: "Upload your photographs",
    text: "Drag in your own photos — they're stored securely and served fast, then framed in your theme's arch, scallop or polaroid style.",
  },
  {
    icon: Link2,
    title: "Claim your link",
    text: "We check availability live. One permanent link for every guest, every ceremony, every blessing.",
  },
  {
    icon: BarChart3,
    title: "Publish & watch it land",
    text: "See views, unique visitors, RSVPs and meal counts the moment guests start opening your invitation.",
  },
] as const;

const occasionShowcase: EventType[] = [
  "wedding", "engagement", "anniversary", "birthday", "baby_shower",
  "housewarming", "graduation", "corporate",
];

const dashboardFeatures = [
  { icon: BarChart3, title: "Live view counts", text: "Total views, unique visitors and a 14-day trend for every invitation." },
  { icon: Users, title: "Guest list & personal links", text: "Import your whole list at once, then copy a personalised link per guest." },
  { icon: MessageSquareHeart, title: "RSVPs & blessings", text: "Responses, headcounts and meal preferences roll up automatically. Moderate the blessings wall if you'd like." },
] as const;

export function LandingClient({
  plans,
  signedIn,
  dashboardHref,
  latestPosts = [],
  faq = [],
  athemes = [],
}: {
  plans: PlanRow[];
  signedIn: boolean;
  dashboardHref: string;
  /** Newest blog posts, read from content/ by the server page. */
  latestPosts?: HomePostSummary[];
  /** Same items the page emits as FAQPage structured data. */
  faq?: { q: string; a: string }[];
  /** The photographed designs. Empty when Cloudinary is not configured. */
  athemes?: AthemeCard[];
}) {
  const router = useRouter();

  /**
   * Choosing a design from the landing page carries it into the builder rather
   * than only starting one. `?theme=` takes the *render* theme id, because that
   * is what the draft and eventually `events.theme_id` hold — the gallery card
   * is a picture, and it stops existing the moment the choice is made.
   *
   * Someone signed out goes to signup with the same parameter on the `next`
   * URL, so the choice survives the round trip through auth. Losing it there
   * would mean asking a couple to pick their design twice.
   */
  const chooseAtheme = (card: AthemeCard) => {
    const target = `/onboarding?theme=${encodeURIComponent(card.renderThemeId)}`;
    router.push(signedIn ? target : `/signup?next=${encodeURIComponent(target)}`);
  };

  return (
    // `type-chrome` is the brand's own pairing (Marcellus over Mulish). The
    // theme preview cards below re-scope themselves with `data-theme`, so they
    // keep their own faces inside it.
    <div className="type-chrome min-h-screen bg-bg">
      <SiteHeader signedIn={signedIn} dashboardHref={dashboardHref} />

      {/* The header's skip link points here, so this landmark has to exist and
          has to be the first thing after the chrome. */}
      <main id="main">
        {/* hero
            The headline is on `type-hero`, a scale of its own: it sits in half
            a grid on a laptop, so borrowing the invitation's display-xl either
            shouted or wrapped to four lines depending on the viewport. The text
            column is given the larger share, because a sentence needs measure
            and the envelope reads fine a little smaller. */}
        <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 lg:grid-cols-[1.08fr_0.92fr] lg:pt-16">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            {/* A hand-lettered line above the headline: the one place on the
                page where the calligraphic face earns its download, and the
                thing that stops the hero reading like a SaaS landing page. */}
            <motion.p variants={fadeUpStagger} className="type-script text-2xl text-accent">
              Shubh aarambh
            </motion.p>
            <motion.h1 variants={fadeUpStagger} custom={1} className="mt-1 type-hero text-primary">
              Your wedding countdown starts here
            </motion.h1>
            <motion.p variants={fadeUpStagger} custom={2} className="mt-6 max-w-md type-body-lg text-muted">
              Join us in crafting the wedding invitation of your dreams. Animated invitation websites
              that open like a real card — wax seal, envelope and all — built for Indian weddings and
              every occasion after.
            </motion.p>
            <motion.div variants={fadeUpStagger} custom={3} className="mt-8 flex flex-wrap gap-3">
              <Link href={signedIn ? "/onboarding" : "/signup"}>
                <Button size="lg" variant="celebration">Get started</Button>
              </Link>
              <Link href="/showcase">
                <Button size="lg" variant="secondary">View theme previews</Button>
              </Link>
            </motion.div>
            {/* Three plain facts, stated rather than implied — they are what a
                reader (and a model summarising this page) actually needs. The
                stitched rule above them is the card-maker's thread, and it is
                doing the work a plain <hr> would do without looking borrowed. */}
            <motion.div variants={fadeUpStagger} custom={4} className="mt-9">
              <hr className="dhaga-rule max-w-sm" />
              {/* The separator is a pseudo-element rather than its own <li>, so
                  a wrapped line never begins with an orphaned dot — which is
                  exactly what the previous markup did at most widths. */}
              <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1 type-caption">
                {[
                  "One link, shared once",
                  "Free to build, pay when you publish",
                  "No app for your guests",
                ].map((fact) => (
                  <li
                    key={fact}
                    className="before:mr-3 before:text-accent/70 before:content-['·'] first:before:hidden"
                  >
                    {fact}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
          <Envelope guestName="Dear Guest & Family" sealMonogram="अ" autoPlay />
        </section>

        <Divider variant="motif" motif="diya" className="mx-auto max-w-4xl px-4" />

        <WhatWeOffer />

        <WhyChooseUs />

        {/* occasions */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-center type-display-lg text-primary">Not just weddings</h2>
          <p className="mx-auto mt-3 max-w-xl text-center type-body-lg text-muted">
            The same craft, whatever you&apos;re celebrating. Pick an occasion and the builder adapts
            its ceremonies, vocabulary and layout to match.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {occasionShowcase.map((type) => (
              <span
                key={type}
                className="rounded-pill border border-ornate/60 bg-surface px-5 py-2.5 font-display text-lg font-semibold text-primary"
              >
                {eventTypeLabels[type]}
              </span>
            ))}
          </div>
        </section>

        {/* the making of your invitation */}
        <section id="how" className="bg-surface py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center type-display-lg text-primary">The making of your invitation</h2>
            <p className="mx-auto mt-3 max-w-xl text-center type-body-lg text-muted">
              Six steps, about ten minutes. Nothing is locked in — change your theme, photos or
              schedule any time, even after it&apos;s live.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {makingSteps.map(({ icon: Icon, title, text }, i) => (
                <Card key={title} variant="ornate" className="p-8">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-4xl font-semibold text-accent">{i + 1}</span>
                    <Icon className="size-6 text-primary" />
                  </div>
                  <h3 className="mt-4 type-h2 text-primary">{title}</h3>
                  <p className="mt-2 type-body text-muted">{text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* uploading assets */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="type-overline">Your photographs, your card</p>
              <h2 className="mt-3 type-display-lg text-primary">Upload once, framed everywhere</h2>
              <p className="mt-4 type-body-lg text-muted">
                Drag in your engagement shoot, your family portraits, the candid your cousin took at
                the roka. Each photo is stored on secure cloud storage, delivered from a global CDN,
                and framed automatically in your theme&apos;s style.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "JPG, PNG, WebP, AVIF and GIF, up to 25 MB each",
                  "Uploaded straight from your browser — nothing passes through a middleman",
                  "Only you and your agent can add or remove them",
                  "Reorder any time; the first two become your story spread",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 type-body">
                    <Check className="mt-1 size-4 shrink-0 text-success" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <Card variant="ornate" className="p-8">
              <p className="type-overline">Gallery preview</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {["upl1", "upl2", "upl3", "upl4", "upl5", "upl6"].map((seed) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={seed}
                    src={`https://picsum.photos/seed/${seed}/200/200`}
                    alt=""
                    className="aspect-square w-full rounded-soft border border-ornate/40 object-cover"
                  />
                ))}
              </div>
              <p className="mt-4 type-caption">
                Sample imagery. Your invitation shows your own photographs.
              </p>
            </Card>
          </div>
        </section>

        {/* the gallery — finished invitations, photographed */}
        {athemes.length > 0 && (
          <section id="designs" className="mx-auto max-w-6xl px-4 py-20">
            <h2 className="text-center type-display-lg text-primary">Our invitation designs</h2>
            <p className="mx-auto mt-3 max-w-xl text-center type-body-lg text-muted">
              Five designs, shown as your guests will actually see them — on a phone. Preview any of
              them full size, then pick one and start building.
            </p>
            <div className="mt-10">
              <AthemeGallery
                cards={athemes}
                onSelect={chooseAtheme}
                selectLabel="Select"
              />
            </div>
          </section>
        )}

        {/* themes */}
        <section className="bg-surface py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center type-display-lg text-primary">A theme for every tradition</h2>
            <p className="mx-auto mt-3 max-w-xl text-center type-body-lg text-muted">
              Hindu, Muslim, Sikh, Christian, interfaith — each with its own motifs, script,
              vocabulary and petals. Never a template recolour.
            </p>
            {/* Each tile is a miniature of the real card — its own fonts,
                greeting script, corner motif and paper — rather than a strip of
                its palette. See ThemePreviewCard for why. */}
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {themes.map((t) => (
                <ThemePreviewCard key={t.id} theme={t} href={`/showcase?theme=${t.id}`} />
              ))}
            </div>
          </div>
        </section>

        {/* dashboard */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-center type-display-lg text-primary">A dashboard that actually helps</h2>
          <p className="mx-auto mt-3 max-w-xl text-center type-body-lg text-muted">
            Sign in and everything about your celebration is in one place — who&apos;s coming, what
            they&apos;re eating, and how your invitation is travelling.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {dashboardFeatures.map(({ icon: Icon, title, text }) => (
              <Card key={title} variant="envelope" className="p-7">
                <Icon className="size-7 text-accent" />
                <h3 className="mt-4 type-h2 text-primary">{title}</h3>
                <p className="mt-2 type-body text-muted">{text}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* agents */}
        <section className="bg-surface py-20">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <Badge tone="accent">Partner programme</Badge>
            <h2 className="mt-4 type-display-lg text-primary">Build invitations for a living</h2>
            <p className="mx-auto mt-4 max-w-2xl type-body-lg text-muted">
              Wedding planners, printers and studios: create invitations on behalf of your clients,
              manage every celebration from one dashboard, and earn a commission on every plan you
              sell. You get a referral code, a live earnings ledger, and full control of each invite
              you build.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup?as=agent">
                <Button size="lg" variant="celebration">Become a partner agent</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* pricing */}
        {plans.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-20">
            <h2 className="text-center type-display-lg text-primary">Simple pricing</h2>
            <p className="mx-auto mt-3 max-w-xl text-center type-body-lg text-muted">
              Every plan is unlocked while we&apos;re in preview — pick whichever fits and the demo
              checkout always succeeds.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <Card key={plan.code} variant="ornate" className="flex flex-col p-8">
                  <p className="type-overline">{plan.name}</p>
                  <p className="mt-3 font-display text-5xl font-semibold text-primary">
                    {plan.price_inr === 0 ? "Free" : `₹${plan.price_inr.toLocaleString("en-IN")}`}
                  </p>
                  {plan.description && <p className="mt-2 type-caption">{plan.description}</p>}
                  <ul className="mt-6 flex-1 space-y-2 text-sm">
                    {(plan.features ?? []).map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={signedIn ? "/onboarding" : "/signup"} className="mt-6">
                    <Button className="w-full">Get started</Button>
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        )}

        <ReadyToCreate signedIn={signedIn} />

        <LatestBlogs posts={latestPosts} />

        <HomeFaq items={faq} />

        {/* closing CTA */}
        <section className="border-t border-ornate/40 bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center">
            <h2 className="type-display-lg text-primary">Your story deserves a beautiful opening.</h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href={signedIn ? "/onboarding" : "/signup"}>
                <Button size="lg" variant="celebration">Create your invitation</Button>
              </Link>
              <Link href="/showcase">
                <Button size="lg" variant="secondary">Browse the showcase</Button>
              </Link>
            </div>
            <Divider variant="motif" motif="marigold" className="w-full max-w-md" />
          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
}
