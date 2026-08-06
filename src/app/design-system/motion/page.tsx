"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { presets } from "@/design-system/motion/presets";
import { transitions } from "@/design-system/motion/transitions";
import { Button, Card, WaxSeal } from "@/design-system/components";
import { Marigold } from "@/design-system/motifs";
import { DsSection } from "../shell";

const LOOPING = new Set(["petal-fall", "diya-flicker", "swing-hang", "float-loop", "heartbeat", "sparkle-pop", "garland-sway"]);

const initialOf: Record<string, string> = {
  "envelope-open": "closed",
  "card-slide-out": "inside",
  "curtain-reveal": "hidden",
  "seal-break": "intact",
};
const animateOf: Record<string, string> = {
  "envelope-open": "open",
  "card-slide-out": "out",
  "curtain-reveal": "revealed",
  "seal-break": "broken",
  "petal-fall": "falling",
  "diya-flicker": "lit",
  "swing-hang": "hanging",
  "float-loop": "floating",
  heartbeat: "beating",
  "sparkle-pop": "twinkling",
  "garland-sway": "swaying",
};

function PresetTile({ name }: { name: keyof typeof presets }) {
  const [key, setKey] = useState(0);
  const looping = LOOPING.has(name);

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex h-28 items-center justify-center overflow-hidden rounded-soft bg-bg" style={{ perspective: 700 }}>
        {name === "seal-break" ? (
          <div key={key}><WaxSeal monogram="अ" broken={key > 0} size={60} /></div>
        ) : name === "shimmer-gold" ? (
          <span key={key} className="shimmer-gold font-display text-xl font-semibold">Swarnil weds Prachi</span>
        ) : name === "sparkle-pop" ? (
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} custom={i} variants={presets[name]} animate="twinkling" className="text-accent text-2xl">✦</motion.span>
            ))}
          </div>
        ) : name === "thread-draw" ? (
          <motion.svg key={key} viewBox="0 0 120 40" className="w-32 text-ornate">
            <motion.path
              d="M4 20 C 30 4, 50 36, 76 20 S 112 12, 116 20"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              variants={presets[name]} initial="hidden" animate="visible"
            />
          </motion.svg>
        ) : name === "petal-fall" ? (
          <div className="relative h-full w-full overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <motion.span key={i} custom={i} variants={presets[name]} initial={{ y: -20 }} animate="falling" className="absolute top-0" style={{ left: `${15 + i * 22}%` }}>
                <Marigold className="size-4 text-accent" />
              </motion.span>
            ))}
          </div>
        ) : (
          <motion.div
            key={key}
            variants={presets[name]}
            initial={initialOf[name] ?? "hidden"}
            animate={animateOf[name] ?? "visible"}
            custom={0}
            style={{ transformOrigin: name === "envelope-open" ? "top center" : undefined }}
            className="flex h-16 w-24 items-center justify-center rounded-soft border border-ornate bg-surface text-xs font-bold text-primary shadow-resting"
          >
            {name === "diya-flicker" ? <span className="size-8 rounded-full bg-accent" /> : "card"}
          </motion.div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <code className="text-xs text-muted">{name}</code>
        {looping ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-accent">loops</span>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setKey((k) => k + 1)}>Replay</Button>
        )}
      </div>
    </Card>
  );
}

function TransitionTile({ name }: { name: keyof typeof transitions }) {
  const [key, setKey] = useState(0);
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex h-28 items-center justify-center overflow-hidden rounded-soft bg-bg" style={{ perspective: 700 }}>
        <motion.div
          key={key}
          variants={transitions[name]}
          initial="hidden"
          animate="visible"
          className="flex h-20 w-32 items-center justify-center rounded-soft ornate-border bg-surface"
        >
          {name === "stagger-grid" ? (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.span key={i} variants={{ hidden: { opacity: 0, scale: 0.5 }, visible: { opacity: 1, scale: 1 } }} className="size-4 rounded-sm bg-accent" />
              ))}
            </div>
          ) : (
            <span className="font-display font-semibold text-primary">view</span>
          )}
        </motion.div>
      </div>
      <div className="flex items-center justify-between">
        <code className="text-xs text-muted">{name}</code>
        <Button size="sm" variant="secondary" onClick={() => setKey((k) => k + 1)}>Replay</Button>
      </div>
    </Card>
  );
}

export default function MotionPage() {
  return (
    <>
      <p className="type-overline">Motion system</p>
      <h1 className="mb-4 mt-1 type-display-lg text-primary">Motion</h1>
      <p className="mb-10 max-w-2xl type-body-lg text-muted">
        {Object.keys(presets).length} animation presets and {Object.keys(transitions).length} view
        transitions, all built on four durations (instant · quick · ceremonial · grand) and the
        ease-silk curve. Everything no-ops under prefers-reduced-motion.
      </p>

      <DsSection title="Animations" lead="Entrances and ambient loops. Looping presets play forever — they're the 'videos' of the system.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(presets) as (keyof typeof presets)[]).map((n) => (
            <PresetTile key={n} name={n} />
          ))}
        </div>
      </DsSection>

      <DsSection title="Transitions" lead="How one view hands over to the next — page loads, section swaps, reveals.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(transitions) as (keyof typeof transitions)[]).map((n) => (
            <TransitionTile key={n} name={n} />
          ))}
        </div>
      </DsSection>
    </>
  );
}
