export const radii = {
  sharp: "var(--radius-sharp)",
  soft: "var(--radius-soft)",
  card: "var(--radius-card)",
  /** Mughal/temple arch top — apply with the `.radius-arch` utility */
  arch: "var(--radius-arch)",
  pill: "var(--radius-pill)",
} as const;

export const shadows = {
  cardResting: "var(--shadow-card-resting)",
  cardLifted: "var(--shadow-card-lifted)",
  /** soft gold hover glow for ornate elements */
  goldGlow: "var(--shadow-gold-glow)",
  /** inner paper shadow for the envelope interior */
  envelopeDepth: "var(--shadow-envelope-depth)",
} as const;
