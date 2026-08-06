"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { brand } from "@/design-system/tokens/colors";
import { typeScale } from "@/design-system/tokens/typography";
import { space } from "@/design-system/tokens/spacing";
import { motifs } from "@/design-system/motifs";
import { presets } from "@/design-system/motion/presets";
import { durations, easings } from "@/design-system/tokens/motion";
import { Button, Card, useToast, WaxSeal } from "@/design-system/components";
import { DsSection } from "../shell";

const semanticSwatches = [
  ["--color-bg", "Page background"],
  ["--color-surface", "Card surface"],
  ["--color-surface-raised", "Raised surface"],
  ["--color-text", "Text"],
  ["--color-text-muted", "Muted text"],
  ["--color-primary", "Primary"],
  ["--color-accent", "Accent / gold"],
  ["--color-border-ornate", "Ornate border"],
  ["--color-success", "Success"],
  ["--color-error", "Error"],
  ["--color-overlay", "Overlay"],
] as const;

const motionRows = [
  ["envelope-open", "grand · 1200ms", "silk"],
  ["card-slide-out", "grand · 1200ms", "silk"],
  ["seal-break", "ceremonial · 600ms", "silk"],
  ["curtain-reveal", "grand · 1200ms", "silk"],
  ["petal-fall", "7–14s loop", "linear"],
  ["diya-flicker", "2.2s loop", "ease-in-out"],
  ["shimmer-gold", "2.4s", "silk"],
  ["fade-up-stagger", "ceremonial · 600ms", "silk"],
] as const;

function MotionDemo({ name }: { name: keyof typeof presets }) {
  const [key, setKey] = useState(0);
  const isLoop = name === "petal-fall" || name === "diya-flicker";

  return (
    <Card className="flex flex-col items-center gap-3 p-5">
      <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-soft bg-bg">
        {name === "seal-break" ? (
          <motion.div key={key}>
            <WaxSeal monogram="अ" broken={key > 0} size={64} />
          </motion.div>
        ) : name === "shimmer-gold" ? (
          <span key={key} className="shimmer-gold font-display text-2xl font-semibold">
            Swarnil weds Prachi
          </span>
        ) : name === "diya-flicker" ? (
          <span className="diya-flicker inline-block size-10 rounded-full bg-accent" />
        ) : (
          <motion.div
            key={key}
            variants={presets[name]}
            initial={
              name === "envelope-open" ? "closed" : name === "card-slide-out" ? "inside" : name === "curtain-reveal" ? "hidden" : "hidden"
            }
            animate={
              name === "envelope-open"
                ? "open"
                : name === "card-slide-out"
                  ? "out"
                  : name === "curtain-reveal"
                    ? "revealed"
                    : name === "petal-fall"
                      ? "falling"
                      : "visible"
            }
            custom={0}
            style={{ transformOrigin: "top center" }}
            className="flex h-14 w-20 items-center justify-center rounded-soft border border-ornate bg-surface text-xs font-semibold text-primary"
          >
            card
          </motion.div>
        )}
      </div>
      <div className="flex w-full items-center justify-between">
        <code className="text-xs text-muted">{name}</code>
        {!isLoop && (
          <Button size="sm" variant="secondary" onClick={() => setKey((k) => k + 1)}>
            Replay
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function TokensPage() {
  const { toast } = useToast();

  return (
    <>
      <p className="type-overline">Foundations</p>
      <h1 className="mb-10 mt-1 type-display-lg text-primary">Tokens</h1>

      <DsSection
        title="Brand colors"
        lead="The fixed Amantrika product palette — used for landing, onboarding and admin chrome. Never overridden by themes."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(brand).map(([name, hex]) => (
            <Card key={name} className="overflow-hidden">
              <div className="h-20" style={{ background: hex }} />
              <div className="p-3">
                <p className="text-sm font-bold">amantrika-{name}</p>
                <p className="type-caption font-mono">{hex}</p>
              </div>
            </Card>
          ))}
        </div>
      </DsSection>

      <DsSection
        title="Semantic colors"
        lead="Every theme overrides only these variables. Switch the theme in the header and watch each swatch flip."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {semanticSwatches.map(([cssVar, label]) => (
            <Card key={cssVar} className="overflow-hidden">
              <div className="h-16 border-b border-ornate/30" style={{ background: `var(${cssVar})` }} />
              <div className="p-3">
                <p className="text-sm font-bold">{label}</p>
                <p className="type-caption font-mono">{cssVar}</p>
              </div>
            </Card>
          ))}
        </div>
      </DsSection>

      <DsSection title="Typography" lead="Cormorant Garamond for ceremony, Mulish for clarity, Tiro Devanagari and Amiri for scripts.">
        <div className="flex flex-col gap-6 rounded-card border border-ornate/40 bg-surface p-6 sm:p-8">
          <div>
            <p className="type-overline mb-1">display-xl</p>
            <p className="type-display-xl text-primary">Swarnil weds Prachi</p>
          </div>
          <div>
            <p className="type-overline mb-1">display-lg · italic (verses)</p>
            <p className="type-display-lg italic text-primary">Two souls, one story</p>
          </div>
          <div>
            <p className="type-overline mb-1">Devanagari — Tiro Devanagari Hindi</p>
            <p className="font-deva text-3xl">।। शुभ विवाह ।।</p>
          </div>
          <div>
            <p className="type-overline mb-1">Arabic/Urdu — Amiri</p>
            <p dir="rtl" className="font-arabic text-3xl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
          </div>
          {(Object.entries(typeScale) as [string, { css: string; note: string }][])
            .filter(([k]) => !k.startsWith("display"))
            .map(([name, t]) => (
              <div key={name} className="flex flex-wrap items-baseline gap-4">
                <span className="w-24 shrink-0 type-caption font-mono">{name}</span>
                <span
                  className={name.startsWith("heading") ? "font-display font-semibold text-primary" : ""}
                  style={{ fontSize: t.css, letterSpacing: name === "overline" ? "0.22em" : undefined, textTransform: name === "overline" ? "uppercase" : undefined }}
                >
                  {name === "overline" ? "Save the date" : "With blessings of both families"}
                </span>
                <span className="type-caption">{t.note}</span>
              </div>
            ))}
        </div>
      </DsSection>

      <DsSection title="Spacing" lead="4px base scale plus ceremonial semantic spacings (card-padding, section-gap, envelope-inset).">
        <div className="flex flex-col gap-2 rounded-card border border-ornate/40 bg-surface p-6">
          {Object.entries(space).map(([step, px]) => (
            <div key={step} className="flex items-center gap-4">
              <span className="w-16 type-caption font-mono">{step} · {px}</span>
              <span className="h-4 rounded-sm bg-accent/60" style={{ width: px }} />
            </div>
          ))}
        </div>
      </DsSection>

      <DsSection title="Radii & shadows" lead="Including the arch radius for Mughal/temple frames and the gold-glow hover.">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {[
            ["sharp", "var(--radius-sharp)"],
            ["soft", "var(--radius-soft)"],
            ["card", "var(--radius-card)"],
            ["arch", "var(--radius-arch)"],
            ["pill", "var(--radius-pill)"],
          ].map(([name, val]) => (
            <div key={name} className="flex flex-col items-center gap-2">
              <div className="h-24 w-full border-2 border-ornate bg-surface" style={{ borderRadius: val }} />
              <span className="type-caption font-mono">{name}</span>
            </div>
          ))}
        </div>
        <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {[
            ["card-resting", "var(--shadow-card-resting)"],
            ["card-lifted", "var(--shadow-card-lifted)"],
            ["gold-glow", "var(--shadow-gold-glow)"],
            ["envelope-depth", "var(--shadow-envelope-depth)"],
          ].map(([name, val]) => (
            <div key={name} className="flex flex-col items-center gap-2">
              <div className="h-24 w-full rounded-card bg-raised" style={{ boxShadow: val }} />
              <span className="type-caption font-mono">{name}</span>
            </div>
          ))}
        </div>
      </DsSection>

      <DsSection title="Motifs & ornaments" lead="Inline SVGs inheriting currentColor — themes recolor them freely. Click to copy the import.">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {Object.entries(motifs).map(([name, Motif]) => (
            <button
              key={name}
              onClick={() => {
                navigator.clipboard?.writeText(`import { motifs } from "@/design-system/motifs"; // ${name}`);
                toast(`Copied ${name} import`, "success");
              }}
              className="flex flex-col items-center gap-2 rounded-card border border-ornate/40 bg-surface p-4 transition-shadow hover:shadow-gold-glow cursor-pointer"
            >
              <Motif className="size-10 text-primary" />
              <span className="type-caption">{name}</span>
            </button>
          ))}
        </div>
      </DsSection>

      <DsSection title="Motion" lead="Durations, easings and the eight named presets. All presets no-op under prefers-reduced-motion.">
        <div className="mb-6 overflow-x-auto rounded-card border border-ornate/40 bg-surface">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-ornate/40">
                <th className="px-4 py-3 type-overline">Preset</th>
                <th className="px-4 py-3 type-overline">Duration</th>
                <th className="px-4 py-3 type-overline">Easing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ornate/15">
              {motionRows.map(([name, dur, ease]) => (
                <tr key={name}>
                  <td className="px-4 py-2.5 font-mono text-xs">{name}</td>
                  <td className="px-4 py-2.5">{dur}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{ease}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mb-4 type-caption">
          Tokens: instant {durations.instant * 1000}ms · quick {durations.quick * 1000}ms · ceremonial {durations.ceremonial * 1000}ms ·
          grand {durations.grand * 1000}ms — ease-silk cubic-bezier({easings.silk.join(", ")})
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(presets) as (keyof typeof presets)[]).map((name) => (
            <MotionDemo key={name} name={name} />
          ))}
        </div>
      </DsSection>
    </>
  );
}
