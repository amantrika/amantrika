"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { themes } from "@/themes";
import { motifs } from "@/design-system/motifs";
import { Button, Card, Divider, Envelope } from "@/design-system/components";
import { fadeUpStagger, staggerContainer } from "@/design-system/motion/presets";

const steps = [
  ["Choose a theme", "Eight ceremonial themes across Hindu, Muslim, Sikh and Christian traditions — never a template recolor."],
  ["Fill your details", "Names, events, story, photos. Your card assembles itself as you type."],
  ["Share your link", "amantrika.com/you-weds-them — one link for every guest, RSVP and blessing."],
] as const;

const testimonials = [
  ["“Guests thought we hired a design studio. It was one evening and a lot of chai.”", "Aditi & Rohan, Mumbai"],
  ["“The envelope opening made my nani cry. Twice.”", "Sana & Bilal, Lahore"],
  ["“Finally an invite that didn't look like a conference registration page.”", "Emily & James, Cotswolds"],
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="inline-flex flex-col leading-none">
          <span className="font-display text-3xl font-semibold text-primary">Amantrika</span>
          <svg aria-hidden viewBox="0 0 120 8" className="h-2 w-32 text-accent">
            <path d="M2 5c20-4 40 3 60-1s40-3 56 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link href="/design-system"><Button variant="ghost" size="sm">Design system</Button></Link>
          <Link href="/admin" className="hidden sm:block"><Button variant="ghost" size="sm">Admin demo</Button></Link>
          <Link href="/onboarding"><Button size="sm">Create your invite</Button></Link>
        </nav>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 lg:grid-cols-2 lg:pt-16">
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <motion.p variants={fadeUpStagger} className="type-overline">Digital wedding invitations</motion.p>
          <motion.h1 variants={fadeUpStagger} custom={1} className="mt-3 type-display-xl text-primary">
            One link.<br />Every blessing.
          </motion.h1>
          <motion.p variants={fadeUpStagger} custom={2} className="mt-5 max-w-md type-body-lg text-muted">
            Animated invitation websites that open like a real card — wax seal, envelope and all.
            Made for Indian weddings, and every wedding.
          </motion.p>
          <motion.div variants={fadeUpStagger} custom={3} className="mt-8 flex flex-wrap gap-3">
            <Link href="/onboarding"><Button size="lg" variant="celebration">Create your invite</Button></Link>
            <Link href="/invite/swarnil-weds-prachi"><Button size="lg" variant="secondary">See a live invite</Button></Link>
          </motion.div>
        </motion.div>
        <Envelope guestName="Dear Guest & Family" sealMonogram="अ" autoPlay />
      </section>

      <Divider variant="motif" motif="diya" className="mx-auto max-w-4xl px-4" />

      {/* theme strip */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center type-display-lg text-primary">A theme for every tradition</h2>
        <p className="mx-auto mt-3 max-w-xl text-center type-body-lg text-muted">
          Hindu, Muslim, Sikh, Christian, interfaith — each with its own motifs, script, vocabulary and petals.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {themes.map((t) => {
            const Motif = motifs[t.motifSet.divider];
            return (
              <Link key={t.id} href={`/invite/swarnil-weds-prachi?theme=${t.id}`} className="group">
                <Card className="overflow-hidden transition-shadow group-hover:shadow-gold-glow">
                  <div className="flex h-16">
                    {t.palette.map((hex) => <span key={hex} className="flex-1" style={{ background: hex }} />)}
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-display font-semibold text-primary">{t.name}</p>
                      <p className="type-caption capitalize">{t.religionTag} · {t.moodTag}</p>
                    </div>
                    <Motif className="size-6 text-accent" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* how it works */}
      <section className="bg-surface py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center type-display-lg text-primary">How it works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map(([title, text], i) => (
              <Card key={title} variant="ornate" className="p-8 text-center">
                <span className="font-display text-5xl font-semibold text-accent">{i + 1}</span>
                <h3 className="mt-3 type-h2 text-primary">{title}</h3>
                <p className="mt-2 type-body text-muted">{text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* testimonials */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center type-display-lg text-primary">Loved at real weddings</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map(([quote, who]) => (
            <Card key={who} variant="envelope" className="p-7">
              <p className="type-verse">{quote}</p>
              <p className="mt-4 type-overline">{who}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA + footer */}
      <footer className="border-t border-ornate/40 bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center">
          <h2 className="type-display-lg text-primary">Your story deserves a beautiful opening.</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/onboarding"><Button size="lg" variant="celebration">Start free demo</Button></Link>
            <Link href="/design-system"><Button size="lg" variant="secondary">Explore the design system</Button></Link>
          </div>
          <Divider variant="motif" motif="marigold" className="w-full max-w-md" />
          <p className="type-caption">Amantrika — UI demo. No accounts, no payments, all data stays in your browser.</p>
        </div>
      </footer>
    </div>
  );
}
