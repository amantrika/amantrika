import type { Variants } from "framer-motion";
import { durations, easings } from "../tokens/motion";

/**
 * Named Framer Motion presets. The app is wrapped in
 * <MotionConfig reducedMotion="user"> (see ThemeProvider), which makes every
 * transform/opacity animation no-op automatically under
 * prefers-reduced-motion — presets don't need individual guards.
 */

export const envelopeOpen: Variants = {
  closed: { rotateX: 0 },
  open: {
    rotateX: -170,
    transition: { duration: durations.grand, ease: easings.silk },
  },
};

export const cardSlideOut: Variants = {
  inside: { y: 40, scale: 0.9, opacity: 0 },
  out: {
    y: -24,
    scale: 1,
    opacity: 1,
    transition: { duration: durations.grand, ease: easings.silk, delay: 0.35 },
  },
};

export const sealBreak: Variants = {
  intact: { scale: 1, rotate: 0, opacity: 1 },
  broken: {
    scale: [1, 1.15, 0.4],
    rotate: [0, -6, 14],
    opacity: [1, 1, 0],
    transition: { duration: durations.ceremonial, ease: easings.silk },
  },
};

export const curtainReveal: Variants = {
  hidden: { scaleY: 1 },
  revealed: {
    scaleY: 0,
    transition: { duration: durations.grand, ease: easings.silk },
  },
};

/** Per-petal: randomize x/delay/duration via custom prop. */
export const petalFall: Variants = {
  falling: (i: number) => ({
    y: "110vh",
    x: [0, 18, -14, 10, 0],
    rotate: [0, 120, 240, 360],
    transition: {
      duration: 7 + (i % 5) * 1.6,
      delay: (i % 7) * 0.9,
      repeat: Infinity,
      ease: "linear",
    },
  }),
};

export const diyaFlicker: Variants = {
  lit: {
    opacity: [1, 0.82, 0.95, 0.85, 1],
    scale: [1, 0.97, 1.02, 0.98, 1],
    transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
  },
};

export const shimmerGold: Variants = {
  rest: { backgroundPosition: "-200% 0" },
  shimmer: {
    backgroundPosition: "200% 0",
    transition: { duration: 2.4, ease: easings.silk },
  },
};

export const fadeUpStagger: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.ceremonial,
      ease: easings.silk,
      delay: i * 0.12,
    },
  }),
};

/** Container variant that staggers `fadeUpStagger` children automatically. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

export const presets = {
  "envelope-open": envelopeOpen,
  "card-slide-out": cardSlideOut,
  "seal-break": sealBreak,
  "curtain-reveal": curtainReveal,
  "petal-fall": petalFall,
  "diya-flicker": diyaFlicker,
  "shimmer-gold": shimmerGold,
  "fade-up-stagger": fadeUpStagger,
} as const;
