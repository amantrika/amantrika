import type { Variants } from "framer-motion";
import { durations, easings } from "../tokens/motion";

/**
 * Named TRANSITIONS — how one view hands over to the next (page loads,
 * section swaps, modal reveals). Each is a Variants object with
 * `hidden` / `visible` (and `exit` where it matters), driven by tokens.
 * All no-op under prefers-reduced-motion via MotionConfig.
 */

export const fadeThrough: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: durations.ceremonial, ease: easings.silk } },
  exit: { opacity: 0, transition: { duration: durations.quick } },
};

export const slideOver: Variants = {
  hidden: { y: "8%", opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: durations.ceremonial, ease: easings.silk } },
  exit: { y: "-6%", opacity: 0, transition: { duration: durations.quick } },
};

export const curtainLeft: Variants = {
  hidden: { clipPath: "inset(0 100% 0 0)" },
  visible: { clipPath: "inset(0 0% 0 0)", transition: { duration: durations.grand, ease: easings.silk } },
};

export const curtainRight: Variants = {
  hidden: { clipPath: "inset(0 0 0 100%)" },
  visible: { clipPath: "inset(0 0 0 0%)", transition: { duration: durations.grand, ease: easings.silk } },
};

export const irisReveal: Variants = {
  hidden: { clipPath: "circle(0% at 50% 50%)" },
  visible: { clipPath: "circle(75% at 50% 50%)", transition: { duration: durations.grand, ease: easings.silk } },
};

export const archReveal: Variants = {
  hidden: { clipPath: "ellipse(60% 0% at 50% 100%)" },
  visible: { clipPath: "ellipse(120% 120% at 50% 100%)", transition: { duration: durations.grand, ease: easings.silk } },
};

export const flipTransition: Variants = {
  hidden: { rotateY: 90, opacity: 0 },
  visible: { rotateY: 0, opacity: 1, transition: { duration: durations.ceremonial, ease: easings.silk } },
  exit: { rotateY: -90, opacity: 0, transition: { duration: durations.quick } },
};

export const scaleFade: Variants = {
  hidden: { scale: 0.92, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: durations.ceremonial, ease: easings.silk } },
  exit: { scale: 1.04, opacity: 0, transition: { duration: durations.quick } },
};

export const blurThrough: Variants = {
  hidden: { filter: "blur(14px)", opacity: 0 },
  visible: { filter: "blur(0px)", opacity: 1, transition: { duration: durations.ceremonial, ease: easings.silk } },
  exit: { filter: "blur(10px)", opacity: 0, transition: { duration: durations.quick } },
};

export const petalWipe: Variants = {
  hidden: { clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)", opacity: 0.4 },
  visible: {
    clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
    opacity: 1,
    transition: { duration: durations.grand, ease: easings.silk },
  },
};

export const drawerRise: Variants = {
  hidden: { y: "100%" },
  visible: { y: 0, transition: { duration: durations.ceremonial, ease: easings.silk } },
  exit: { y: "100%", transition: { duration: durations.quick } },
};

export const staggerGrid: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export const transitions = {
  "fade-through": fadeThrough,
  "slide-over": slideOver,
  "curtain-left": curtainLeft,
  "curtain-right": curtainRight,
  "iris-reveal": irisReveal,
  "arch-reveal": archReveal,
  "flip-transition": flipTransition,
  "scale-fade": scaleFade,
  "blur-through": blurThrough,
  "petal-wipe": petalWipe,
  "drawer-rise": drawerRise,
  "stagger-grid": staggerGrid,
} as const;

export type TransitionName = keyof typeof transitions;
