import type { MotifName } from "../motifs";

/**
 * Ornament tokens. The visual implementation of `ornate-border` is the
 * `.ornate-border` utility in globals.css (double line, gold gradient inner
 * ring via ::after). Motifs are inline SVG components in ../motifs that
 * inherit currentColor so any theme can recolor them.
 */
export const ornateBorder = {
  className: "ornate-border",
  description: "double-line border; outer solid + inner 55% gold, follows --color-border-ornate",
} as const;

export const motifTokens: MotifName[] = [
  "paisley",
  "mango-leaf",
  "marigold",
  "diya",
  "kalash",
  "peacock-feather",
  "mehndi-corner",
  "jaali-pattern",
  "crescent-star",
  "church-arch",
  "floral-cross",
  "olive-branch",
];
