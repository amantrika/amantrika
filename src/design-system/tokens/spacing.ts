/** 4px base spacing scale plus ceremonial semantic spacings. */
export const space = {
  1: "4px", 2: "8px", 3: "12px", 4: "16px", 5: "20px", 6: "24px",
  8: "32px", 10: "40px", 12: "48px", 16: "64px", 20: "80px", 24: "96px",
} as const;

export const semanticSpace = {
  cardPadding: "var(--space-card-padding)",
  sectionGap: "var(--space-section-gap)",
  envelopeInset: "var(--space-envelope-inset)",
} as const;
