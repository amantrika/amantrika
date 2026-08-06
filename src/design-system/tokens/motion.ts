/** Motion tokens. Framer Motion presets live in ../motion/presets.ts */
export const durations = {
  instant: 0.1,
  quick: 0.2,
  ceremonial: 0.6,
  grand: 1.2,
} as const;

export const easings = {
  silk: [0.22, 1, 0.36, 1] as const,
  bounceSoft: [0.34, 1.4, 0.64, 1] as const,
};

export const presetNames = [
  "envelope-open",
  "card-slide-out",
  "seal-break",
  "curtain-reveal",
  "petal-fall",
  "diya-flicker",
  "shimmer-gold",
  "fade-up-stagger",
] as const;
export type PresetName = (typeof presetNames)[number];
