import type { CSSProperties, HTMLAttributes } from "react";

/**
 * DecorativeBorder — a dozen distinct card-border styles, all theme-adaptive.
 *
 * Technique: each edge is a strip whose background is the theme's
 * --color-border-ornate, masked by a repeating SVG tile — so every design
 * recolors with the theme for free. Vertical edges use the same tile
 * rotated 90°, corners get round anchors. Documented at /design-system/borders.
 */

export type BorderStyleName =
  | "double" | "triple" | "thread" | "beads" | "scallop" | "zigzag"
  | "chevron" | "meander" | "vine" | "rope" | "stamp" | "gradient";

/* Tile inner content (black = visible), drawn in a w×12 box. */
const tiles: Record<string, { w: number; inner: string }> = {
  beads: { w: 16, inner: `<circle cx='8' cy='6' r='3.4' fill='black'/>` },
  scallop: { w: 20, inner: `<path d='M0 12 A10 10 0 0 1 20 12 Z' fill='black'/>` },
  zigzag: { w: 16, inner: `<path d='M0 11 8 2 16 11 Z' fill='black'/>` },
  chevron: { w: 16, inner: `<path d='M0 10 8 3 16 10 16 7 8 0 0 7 Z' fill='black'/><path d='M0 12 8 8 16 12 16 11 8 6 0 11 Z' fill='black'/>` },
  meander: { w: 20, inner: `<path d='M2 12 V4 H18 V12 M6 12 V8 H14 V12' stroke='black' stroke-width='2' fill='none'/>` },
  vine: { w: 28, inner: `<path d='M0 6 C 7 0, 14 12, 21 6 S 28 6 28 6' stroke='black' stroke-width='1.6' fill='none'/><circle cx='7' cy='2.6' r='1.8' fill='black'/><circle cx='21' cy='9.4' r='1.8' fill='black'/>` },
  rope: { w: 14, inner: `<path d='M-2 10 C 2 2, 6 2, 10 10' stroke='black' stroke-width='2.4' fill='none'/><path d='M5 10 C 9 2, 13 2, 17 10' stroke='black' stroke-width='2.4' fill='none'/>` },
  thread: { w: 18, inner: `<rect x='1' y='4.5' width='10' height='3' rx='1.5' fill='black'/>` },
};

const SIZE = 12;

function maskH(name: keyof typeof tiles) {
  const t = tiles[name];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${t.w}' height='${SIZE}'>${t.inner}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function maskV(name: keyof typeof tiles) {
  const t = tiles[name];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${SIZE}' height='${t.w}'><g transform='rotate(90 ${SIZE / 2} ${SIZE / 2})'>${t.inner}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function Strips({ variant, inset = 5 }: { variant: keyof typeof tiles; inset?: number }) {
  const h = maskH(variant);
  const v = maskV(variant);
  const strip: CSSProperties = { position: "absolute", backgroundColor: "var(--color-border-ornate)" };
  const mh: CSSProperties = { WebkitMaskImage: h, maskImage: h, WebkitMaskRepeat: "repeat-x", maskRepeat: "repeat-x" };
  const mv: CSSProperties = { WebkitMaskImage: v, maskImage: v, WebkitMaskRepeat: "repeat-y", maskRepeat: "repeat-y" };
  const e = inset;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <span style={{ ...strip, ...mh, top: e, left: e + SIZE, right: e + SIZE, height: SIZE }} />
      <span style={{ ...strip, ...mh, bottom: e, left: e + SIZE, right: e + SIZE, height: SIZE, transform: "scaleY(-1)" }} />
      <span style={{ ...strip, ...mv, top: e + SIZE, bottom: e + SIZE, left: e, width: SIZE }} />
      <span style={{ ...strip, ...mv, top: e + SIZE, bottom: e + SIZE, right: e, width: SIZE, transform: "scaleX(-1)" }} />
      {[
        { top: e, left: e }, { top: e, right: e },
        { bottom: e, left: e }, { bottom: e, right: e },
      ].map((pos, i) => (
        <span
          key={i}
          style={{
            position: "absolute", width: SIZE, height: SIZE, borderRadius: 999,
            backgroundColor: "var(--color-border-ornate)",
            boxShadow: "inset 0 1.5px 2px color-mix(in srgb, white 45%, transparent), inset 0 -1.5px 2px color-mix(in srgb, black 30%, transparent)",
            ...pos,
          }}
        />
      ))}
    </div>
  );
}

export interface DecorativeBorderProps extends HTMLAttributes<HTMLDivElement> {
  variant?: BorderStyleName;
}

export function DecorativeBorder({ variant = "double", className = "", children, ...rest }: DecorativeBorderProps) {
  if (variant === "double") {
    return (
      <div className={`ornate-border rounded-card bg-surface p-8 ${className}`} {...rest}>
        {children}
      </div>
    );
  }
  if (variant === "triple") {
    return (
      <div className={`relative rounded-card border-2 border-ornate bg-surface p-8 ${className}`} {...rest}>
        <span aria-hidden className="pointer-events-none absolute inset-1.5 rounded-[12px] border border-ornate/70" />
        <span aria-hidden className="pointer-events-none absolute inset-3 rounded-[10px] border border-ornate/40" />
        {children}
      </div>
    );
  }
  if (variant === "gradient") {
    return (
      <div className={`rounded-card p-[3px] shadow-resting ${className}`} style={{ background: "var(--gradient-gold)" }} {...rest}>
        <div className="rounded-[13px] bg-surface p-8">{children}</div>
      </div>
    );
  }
  if (variant === "stamp") {
    /* postage-stamp: hole-punched tile along the edges, solid centre unioned
       on top so the perforation only shows at the rim */
    const holes = "radial-gradient(circle 5px, transparent 4.6px, black 5px)";
    const solid = "linear-gradient(black, black)";
    const maskStyle: CSSProperties = {
      WebkitMaskImage: `${holes}, ${solid}`,
      maskImage: `${holes}, ${solid}`,
      WebkitMaskSize: "16px 16px, calc(100% - 22px) calc(100% - 22px)",
      maskSize: "16px 16px, calc(100% - 22px) calc(100% - 22px)",
      WebkitMaskPosition: "-8px -8px, 11px 11px",
      maskPosition: "-8px -8px, 11px 11px",
      WebkitMaskRepeat: "repeat, no-repeat",
      maskRepeat: "repeat, no-repeat",
    };
    return (
      <div className={`relative ${className}`} {...rest}>
        <div className="bg-surface p-8" style={maskStyle}>
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className={`relative rounded-soft bg-surface p-10 shadow-resting ${className}`} {...rest}>
      <Strips variant={variant} />
      <div className="relative">{children}</div>
    </div>
  );
}

export const borderStyles: { name: BorderStyleName; label: string; note: string }[] = [
  { name: "double", label: "Double line", note: "The classic ornate card rule — outer solid, inner soft." },
  { name: "triple", label: "Triple line", note: "Three concentric rules fading inward, very royal." },
  { name: "gradient", label: "Gold gradient", note: "A gradient-gold band wrapping the panel." },
  { name: "thread", label: "Thread patti", note: "Flat silk-thread dashes — the quiet dhaga." },
  { name: "beads", label: "Moti beads", note: "A string of 3D pearls along every edge." },
  { name: "scallop", label: "Scallop", note: "Soft lace semicircles, like a cut-paper doily." },
  { name: "zigzag", label: "Temple zigzag", note: "Triangular temple-border teeth." },
  { name: "chevron", label: "Chevron", note: "Doubled arrow stripes with woven depth." },
  { name: "meander", label: "Jaali key", note: "A repeating jaali / greek-key band." },
  { name: "vine", label: "Floral vine", note: "A winding creeper with alternating buds." },
  { name: "rope", label: "Rope twist", note: "Twisted cord — two interleaved strands." },
  { name: "stamp", label: "Postage stamp", note: "Perforated stamp edge, punched all around." },
];
