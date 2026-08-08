import type { IconProps } from "./index";

/**
 * Mission and value icons — the vocabulary the About and marketing pages need
 * that the wedding set doesn't cover: purpose, craft, sustainability, reach,
 * price, privacy.
 *
 * Same contract as the main icon set: stroke-based, 48×48 grid, inherits
 * currentColor, decorative by default and labelled when given a `title`.
 * Usage: <Sapling className="size-8 text-accent" />
 */

function base(props: IconProps) {
  const { title, ...rest } = props;
  return {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 48 48",
    width: 24,
    height: 24,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": title ? undefined : true,
    role: title ? "img" : undefined,
    ...rest,
  };
}

const T = ({ p }: { p: IconProps }) => (p.title ? <title>{p.title}</title> : null);

/* ---------- purpose ---------- */

/** A diya with a rising flame — why we exist. */
export function GuidingLamp(p: IconProps) {
  return (
    <svg {...base(p)}>
      <T p={p} />
      <path d="M24 6c0 4-3 5-3 8a3 3 0 0 0 6 0c0-3-3-4-3-8Z" />
      <path d="M10 28h28c0 6-6 10-14 10S10 34 10 28Z" />
      <path d="M14 28c2-3 6-4 10-4s8 1 10 4" />
      <path d="M8 42h32" strokeDasharray="3 4" />
    </svg>
  );
}

/** A folded card releasing a link — the product in one mark. */
export function CardToLink(p: IconProps) {
  return (
    <svg {...base(p)}>
      <T p={p} />
      <rect x="6" y="10" width="22" height="28" rx="2" />
      <path d="M11 18h12M11 24h12M11 30h7" />
      <path d="M32 20a5 5 0 0 1 7 7l-3 3" />
      <path d="M40 32a5 5 0 0 1-7 7l-3-3" />
      <path d="M33 27l6 6" />
    </svg>
  );
}

/* ---------- craft ---------- */

/** Compass over a rule — design decisions, made deliberately. */
export function CraftedByHand(p: IconProps) {
  return (
    <svg {...base(p)}>
      <T p={p} />
      <circle cx="24" cy="14" r="3" />
      <path d="M22 17L12 40M26 17l10 23" />
      <path d="M17 30h14" />
      <path d="M8 44h32" strokeDasharray="2 5" />
    </svg>
  );
}

/** Layered paper with a gold corner — quality of finish. */
export function FineFinish(p: IconProps) {
  return (
    <svg {...base(p)}>
      <T p={p} />
      <path d="M12 8h16l8 8v24H12Z" />
      <path d="M28 8v8h8" />
      <path d="M18 26h12M18 32h8" />
      <path d="M36 6l1.5 3.5L41 11l-3.5 1.5L36 16l-1.5-3.5L31 11l3.5-1.5Z" />
    </svg>
  );
}

/* ---------- reach ---------- */

/** Two scripts sharing a stem — many languages, one invitation. */
export function ManyScripts(p: IconProps) {
  return (
    <svg {...base(p)}>
      <T p={p} />
      <path d="M24 8v32" />
      <path d="M10 14h12M10 14c0 10 4 16 12 18" />
      <path d="M38 14H26M38 14c0 10-4 16-12 18" />
      <circle cx="24" cy="42" r="2" />
    </svg>
  );
}

/** A globe with a wedding ring orbit — relatives everywhere. */
export function AcrossOceans(p: IconProps) {
  return (
    <svg {...base(p)}>
      <T p={p} />
      <circle cx="24" cy="24" r="14" />
      <path d="M10 24h28" />
      <path d="M24 10c4 4 6 9 6 14s-2 10-6 14c-4-4-6-9-6-14s2-10 6-14Z" />
      <ellipse cx="24" cy="24" rx="19" ry="6" transform="rotate(-20 24 24)" strokeDasharray="3 3" />
    </svg>
  );
}

/* ---------- responsibility ---------- */

/** A sapling from a folded card — the eco argument, honestly drawn. */
export function Sapling(p: IconProps) {
  return (
    <svg {...base(p)}>
      <T p={p} />
      <path d="M24 42V22" />
      <path d="M24 26c-6 0-10-4-10-10 6 0 10 4 10 10Z" />
      <path d="M24 22c6-1 9-5 9-11-6 0-9 5-9 11Z" />
      <path d="M14 42h20" />
    </svg>
  );
}

/** A shield around a rupee — nothing sold, nothing leaked. */
export function KeptPrivate(p: IconProps) {
  return (
    <svg {...base(p)}>
      <T p={p} />
      <path d="M24 6l14 5v12c0 9-6 15-14 19-8-4-14-10-14-19V11Z" />
      <path d="M19 17h10M19 22h10" />
      <path d="M27 17c0 4-3 5-8 5l9 9" />
    </svg>
  );
}

/** A rupee with a downward arrow — affordable, said plainly. */
export function FairPrice(p: IconProps) {
  return (
    <svg {...base(p)}>
      <T p={p} />
      <circle cx="24" cy="24" r="17" />
      <path d="M18 15h12M18 21h12" />
      <path d="M27 15c0 5-4 6-9 6l11 12" />
    </svg>
  );
}

/* ---------- momentum ---------- */

/** Stopwatch with a petal hand — minutes, not weeks. */
export function MinutesNotWeeks(p: IconProps) {
  return (
    <svg {...base(p)}>
      <T p={p} />
      <circle cx="24" cy="26" r="15" />
      <path d="M20 6h8M24 6v5" />
      <path d="M24 26V17" />
      <path d="M24 26l7 5" />
      <path d="M37 13l3-3" />
    </svg>
  );
}

/** Two hands offering a card — the gesture the product is built around. */
export function OfferedByHand(p: IconProps) {
  return (
    <svg {...base(p)}>
      <T p={p} />
      <rect x="16" y="8" width="16" height="14" rx="2" />
      <path d="M21 14h6" />
      <path d="M8 40c0-6 4-10 8-11l8 3 8-3c4 1 8 5 8 11" />
      <path d="M24 32v8" />
    </svg>
  );
}

/** Chart rising out of an envelope — the host's own analytics. */
export function SeenAndCounted(p: IconProps) {
  return (
    <svg {...base(p)}>
      <T p={p} />
      <path d="M6 16h28v22H6Z" />
      <path d="M6 16l14 10 14-10" />
      <path d="M40 40V22M34 40V28M46 40V16" />
    </svg>
  );
}

/** The registry powers icon galleries and keeps names discoverable. */
export const missionIcons = {
  GuidingLamp,
  CardToLink,
  CraftedByHand,
  FineFinish,
  ManyScripts,
  AcrossOceans,
  Sapling,
  KeptPrivate,
  FairPrice,
  MinutesNotWeeks,
  OfferedByHand,
  SeenAndCounted,
} as const;

export type MissionIconName = keyof typeof missionIcons;
