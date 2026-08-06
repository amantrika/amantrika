import { useId } from "react";
import type { SVGProps } from "react";

/**
 * Repeating background patterns — one visual language per theme.
 * Rendered as an absolutely-positioned SVG in currentColor, so any theme
 * can tint them; pair with `text-accent opacity-*` on a relative parent:
 *   <div className="relative">
 *     <PatternBackground name="paisley-damask" className="text-accent opacity-[0.07]" />
 *     …content…
 *   </div>
 */

type Tile = { w: number; h: number; content: React.ReactNode };

const tiles: Record<string, Tile> = {
  /* Hindu royal — mirrored paisley damask */
  "paisley-damask": {
    w: 64, h: 64,
    content: (
      <>
        <path d="M32 8c8 0 13 6 13 12 0 7-6 10-11 10-4 0-7-2.5-7-6 0-2.8 2-5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M32 56c-8 0-13-6-13-12 0-7 6-10 11-10 4 0 7 2.5 7 6 0 2.8-2 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8" cy="32" r="1.5" fill="currentColor" />
        <circle cx="56" cy="32" r="1.5" fill="currentColor" />
      </>
    ),
  },
  /* Haldi — scattered marigold blooms */
  "marigold-scatter": {
    w: 72, h: 72,
    content: (
      <>
        {[[18, 18], [54, 44]].map(([x, y]) => (
          <g key={`${x}${y}`}>
            {Array.from({ length: 8 }).map((_, i) => (
              <ellipse key={i} cx={x} cy={y - 7} rx="2.6" ry="5" transform={`rotate(${i * 45} ${x} ${y})`} fill="none" stroke="currentColor" strokeWidth="1.3" />
            ))}
            <circle cx={x} cy={y} r="2.4" fill="currentColor" />
          </g>
        ))}
        <circle cx="54" cy="12" r="1.4" fill="currentColor" />
        <circle cx="16" cy="56" r="1.4" fill="currentColor" />
      </>
    ),
  },
  /* Peacock — feather eyes */
  "feather-eyes": {
    w: 64, h: 80,
    content: (
      <>
        <ellipse cx="32" cy="26" rx="10" ry="15" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <ellipse cx="32" cy="26" rx="5" ry="8" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".7" />
        <circle cx="32" cy="26" r="2.2" fill="currentColor" />
        <path d="M32 41v14m0-14c-4 3-8 4-12 3m12-3c4 3 8 4 12 3" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".6" />
      </>
    ),
  },
  /* Temple south — kolam dots + temple steps */
  "kolam-steps": {
    w: 56, h: 56,
    content: (
      <>
        <path d="M8 40h8v-8h8v-8h8v-8h8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="14" r="1.5" fill="currentColor" />
        <circle cx="24" cy="46" r="1.5" fill="currentColor" />
        <circle cx="44" cy="44" r="1.5" fill="currentColor" />
      </>
    ),
  },
  /* Nikah — eight-point star jaali lattice */
  "star-jaali": {
    w: 56, h: 56,
    content: (
      <>
        <path d="M28 6l5 12 12 5-12 5-5 12-5-12-12-5 12-5 5-12Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="28" cy="28" r="3" fill="none" stroke="currentColor" strokeWidth="1.1" opacity=".7" />
        <circle cx="0" cy="0" r="2" fill="currentColor" opacity=".6" />
        <circle cx="56" cy="56" r="2" fill="currentColor" opacity=".6" />
        <circle cx="56" cy="0" r="2" fill="currentColor" opacity=".6" />
        <circle cx="0" cy="56" r="2" fill="currentColor" opacity=".6" />
      </>
    ),
  },
  /* Mehndi nights — crescent + stars sky */
  "night-sky": {
    w: 84, h: 84,
    content: (
      <>
        <path d="M28 14a10 10 0 1 0 8 16 8 8 0 0 1-8-16Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M62 50l1.8 3.8 4.2.6-3 3 .7 4.1-3.7-2-3.7 2 .7-4.1-3-3 4.2-.6L62 50Z" fill="currentColor" opacity=".8" />
        <circle cx="66" cy="18" r="1.3" fill="currentColor" />
        <circle cx="16" cy="62" r="1.3" fill="currentColor" />
        <circle cx="44" cy="72" r="1" fill="currentColor" opacity=".7" />
      </>
    ),
  },
  /* Anand karaj — phulkari triangles */
  phulkari: {
    w: 48, h: 48,
    content: (
      <>
        <path d="M0 24 12 8l12 16L36 8l12 16" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M0 44 12 28l12 16 12-16 12 16" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".65" />
        <circle cx="12" cy="8" r="1.4" fill="currentColor" />
        <circle cx="36" cy="8" r="1.4" fill="currentColor" />
      </>
    ),
  },
  /* Cathedral — laurel sprigs */
  "laurel-sprig": {
    w: 72, h: 72,
    content: (
      <>
        <path d="M18 54C26 44 30 32 30 18" fill="none" stroke="currentColor" strokeWidth="1.3" />
        {[46, 38, 30].map((y, i) => (
          <path key={y} d={`M${24 + i} ${y}c-5-1-8-4-8-9 5 0 8 3 9 7m1-5c-2-4-1-8 2-11 3 3 3 7 1 11`} fill="none" stroke="currentColor" strokeWidth="1.1" opacity=".75" />
        ))}
        <circle cx="56" cy="20" r="1.4" fill="currentColor" opacity=".7" />
        <circle cx="60" cy="56" r="1.4" fill="currentColor" opacity=".7" />
      </>
    ),
  },
  /* Universal — bandhani tie-dye dots */
  bandhani: {
    w: 40, h: 40,
    content: (
      <>
        <circle cx="10" cy="10" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="30" cy="30" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="10" cy="10" r="0.9" fill="currentColor" />
        <circle cx="30" cy="30" r="0.9" fill="currentColor" />
      </>
    ),
  },
  /* Universal — block-print buti flower */
  "buti-block": {
    w: 52, h: 52,
    content: (
      <>
        <path d="M26 12c3 4 3 8 0 11-3-3-3-7 0-11Z" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M26 23c0 6-3 10-8 12m8-12c0 6 3 10 8 12" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".8" />
        <circle cx="26" cy="40" r="1.4" fill="currentColor" />
      </>
    ),
  },
} as const;

export type PatternName = keyof typeof tiles;
export const patternNames = Object.keys(tiles) as PatternName[];

export function PatternBackground({
  name,
  className = "",
  ...rest
}: SVGProps<SVGSVGElement> & { name: PatternName }) {
  const id = useId();
  const tile = tiles[name];
  return (
    <svg aria-hidden className={`pointer-events-none absolute inset-0 size-full ${className}`} {...rest}>
      <defs>
        <pattern id={id} width={tile.w} height={tile.h} patternUnits="userSpaceOnUse">
          {tile.content}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
