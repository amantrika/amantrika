"use client";

import { Card, Envelope, Divider } from "@/design-system/components";
import { DsSection } from "./shell";

const principles = [
  {
    title: "Ceremonial, not corporate",
    text: "Generous space, display serifs, warm ivory paper. If a screen could pass for a SaaS dashboard, it isn't finished.",
  },
  {
    title: "Ornament with restraint",
    text: "One grand moment per page — the envelope, the seal. Everything after it stays quiet: thin gold rules, small motifs, soft shadows.",
  },
  {
    title: "Every culture, first-class",
    text: "Hindu, Muslim, Sikh, Christian and interfaith weddings each get real vocabulary, motifs, scripts and meal options — themes are never a recolor.",
  },
];

export default function DsIntroPage() {
  return (
    <>
      <div className="mb-14 grid items-center gap-8 lg:grid-cols-2">
        <div>
          <p className="type-overline">Amantrika Design System</p>
          <h1 className="mt-2 type-display-lg text-primary">Crafted like a wedding card.</h1>
          <p className="mt-4 max-w-lg type-body-lg text-muted">
            Amantrika DS is the token set, component library and theme engine behind every Amantrika
            invitation — built to feel like ivory card-stock, antique gold and a seal you can&apos;t wait
            to break.
          </p>
        </div>
        <Envelope guestName="You're invited" sealMonogram="अ" />
      </div>

      <Divider variant="motif" motif="diya" className="mb-14" />

      <DsSection title="Principles" lead="Three rules that shape every token and component decision.">
        <div className="grid gap-4 md:grid-cols-3">
          {principles.map((p) => (
            <Card key={p.title} variant="ornate" className="p-6">
              <h3 className="type-h3 text-primary">{p.title}</h3>
              <p className="mt-2 type-body text-muted">{p.text}</p>
            </Card>
          ))}
        </div>
      </DsSection>

      <DsSection title="How it's organised" lead="Start at Foundations, compose with Components, ship with Themes.">
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            ["01 · Foundations", "Colors, type, spacing, radii, shadows, motifs and motion — all exposed as CSS variables and TS tokens."],
            ["02 · Components", "Product chrome (buttons, tables, stats) plus the signature wedding set (envelope, seal, petal rain)."],
            ["03 · Themes", "Eight complete themes across religions and regions. Each overrides only semantic tokens."],
          ].map(([t, d]) => (
            <li key={t} className="rounded-card border border-ornate/40 bg-surface p-6">
              <p className="type-overline">{t}</p>
              <p className="mt-2 type-body text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </DsSection>
    </>
  );
}
