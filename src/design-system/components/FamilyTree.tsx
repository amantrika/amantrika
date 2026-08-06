"use client";

import { motion } from "framer-motion";
import { RelationCard } from "./interactive";
import { fadeUpStagger, staggerContainer } from "../motion/presets";

export interface FamilyMember {
  name: string;
  relation: string;
  seed: string;
}

export interface FamilySide {
  /** e.g. "The Singh Family" */
  household: string;
  /** the partner from this side */
  partner: FamilyMember;
  /** parents / grandparents */
  elders: FamilyMember[];
  /** siblings, cousins, the sangeet-dance crew */
  siblings?: FamilyMember[];
}

/**
 * FamilyTree — two households joined by a gold marriage knot. Elders sit on
 * top, the couple in the middle, siblings below; connector lines are drawn
 * with the theme's ornate color so it recolors per theme.
 *
 * @example <FamilyTree groomSide={…} brideSide={…} order="bride-first" />
 */
export function FamilyTree({
  groomSide,
  brideSide,
  order = "groom-first",
  className = "",
}: {
  groomSide: FamilySide;
  brideSide: FamilySide;
  /** respects the bride/groom-side choice made in onboarding */
  order?: "groom-first" | "bride-first";
  className?: string;
}) {
  const [first, second] = order === "bride-first" ? [brideSide, groomSide] : [groomSide, brideSide];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      className={`flex flex-col items-center gap-8 ${className}`}
    >
      {/* the two households */}
      <div className="grid w-full gap-8 sm:grid-cols-2">
        {[first, second].map((side, s) => (
          <motion.div key={side.household} variants={fadeUpStagger} custom={s} className="flex flex-col items-center gap-5">
            <p className="type-overline">{side.household}</p>

            {/* elders */}
            <div className="flex flex-wrap justify-center gap-6">
              {side.elders.map((m) => (
                <RelationCard key={m.name} {...m} />
              ))}
            </div>

            {/* connector down to the partner */}
            <svg aria-hidden viewBox="0 0 120 44" preserveAspectRatio="none" className="h-11 w-48 text-ornate">
              <path d="M12 2 V16 H108 V2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M60 16 V42" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="4 4" />
              <circle cx="60" cy="16" r="2.6" fill="currentColor" />
            </svg>

            {/* the partner */}
            <div className="rounded-card border border-ornate/50 bg-surface p-4 shadow-resting">
              <RelationCard {...side.partner} />
            </div>

            {/* siblings */}
            {side.siblings?.length ? (
              <>
                <svg aria-hidden viewBox="0 0 120 20" className="h-5 w-28 text-ornate">
                  <path d="M60 0 V18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 3" />
                </svg>
                <div className="flex flex-wrap justify-center gap-5">
                  {side.siblings.map((m) => (
                    <RelationCard key={m.name} {...m} className="scale-90" />
                  ))}
                </div>
              </>
            ) : null}
          </motion.div>
        ))}
      </div>

      {/* the marriage knot joining both sides */}
      <motion.div variants={fadeUpStagger} custom={2} className="flex w-full items-center gap-4">
        <span className="gold-rule flex-1" />
        <svg aria-hidden viewBox="0 0 64 40" className="h-10 w-16 text-accent">
          {/* two interlocked rings = the gathbandhan knot */}
          <circle cx="24" cy="20" r="12" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <circle cx="40" cy="20" r="12" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path d="M32 8 q4 12 0 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.6" strokeDasharray="3 3" />
        </svg>
        <span className="gold-rule flex-1" />
      </motion.div>
      <motion.p variants={fadeUpStagger} custom={3} className="type-accent-face text-center text-2xl text-primary">
        Two families, one home
      </motion.p>
    </motion.div>
  );
}
