/**
 * Amantrika color tokens.
 * `brand` is the fixed product palette (landing/admin/onboarding chrome).
 * `semantic` lists the CSS custom properties that every theme may override —
 * themes never touch brand values, only these vars (see globals.css).
 */
export const brand = {
  maroon: "#6B1F2A",
  gold: "#C9A227",
  ivory: "#FBF6EC",
  henna: "#8C4A2F",
  rani: "#D63A6A",
  peacock: "#14595B",
  ink: "#2B1B12",
} as const;

export const semanticVars = [
  "--color-bg",
  "--color-surface",
  "--color-surface-raised",
  "--color-text",
  "--color-text-muted",
  "--color-primary",
  "--color-accent",
  "--color-border-ornate",
  "--color-success",
  "--color-error",
  "--color-overlay",
] as const;

export type SemanticVar = (typeof semanticVars)[number];
export type BrandColor = keyof typeof brand;
