import type { SVGProps } from "react";

/**
 * Amantrika custom icon set — hand-drawn wedding iconography that lucide
 * doesn't have. Stroke-based, inherits currentColor, 48×48 grid.
 * Usage: <Shehnai className="size-6 text-accent" />
 * Registry export `icons` powers the /design-system/icons gallery.
 */
export type IconProps = SVGProps<SVGSVGElement> & { title?: string };

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

/* ---------- instruments & baraat ---------- */

export function Shehnai(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M8 10l24 22c3 3 8 3 10-1-1-4-4-6-8-6L10 8Z" />
      <path d="M40 31c2 2 3 5 2 8-3 1-6 0-8-2" />
      <circle cx="16" cy="15" r="1" fill="currentColor" stroke="none" />
      <circle cx="21" cy="19.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="26" cy="24" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Dhol(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <ellipse cx="14" cy="24" rx="5" ry="11" />
      <ellipse cx="34" cy="24" rx="5" ry="11" />
      <path d="M14 13h20M14 35h20" />
      <path d="M17 15l14 6m-14 0l14-6m-14 6l14 6m-14 0l14-6" opacity=".6" />
    </svg>
  );
}

export function BaraatHorse(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M10 40c0-8 4-14 11-16l9-2 6-8 5 3-3 7 2 6-4 10" />
      <path d="M30 22c-2-5-7-8-13-8-4 0-7 2-9 5l5 3" />
      <path d="M15 40v-6m14 6v-7" />
      <path d="M38 15l4-4" opacity=".7" />
      <circle cx="37" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Doli(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M6 20h36" />
      <path d="M12 20v-6c0-3 2-5 5-5h14c3 0 5 2 5 5v6" />
      <path d="M14 20v14h20V20" />
      <path d="M14 34H8m26 0h6M24 9V5" />
      <path d="M19 26h10" opacity=".6" />
    </svg>
  );
}

export function BandBaaja(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <circle cx="24" cy="28" r="12" />
      <circle cx="24" cy="28" r="7" opacity=".55" />
      <path d="M14 18l-4-6m28 6 4-6M24 12V6" />
      <circle cx="24" cy="28" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ---------- rituals & adornment ---------- */

export function Varmala(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M10 12c0 14 6 24 14 28 8-4 14-14 14-28" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <circle key={i} cx={10 + i * 4.7} cy={12 + Math.sin((i / 6) * Math.PI) * 26} r="2.4" opacity=".85" />
      ))}
    </svg>
  );
}

export function MehndiHand(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M18 44V22m0 0v-9c0-1.7 1.3-3 3-3s3 1.3 3 3v8m0-1v-11c0-1.7 1.3-3 3-3s3 1.3 3 3v12m0-1v-8c0-1.7 1.3-3 3-3s3 1.3 3 3v14c0 8-4 15-11 18h-4c-2.5-1-5-3-6-5" />
      <circle cx="27" cy="28" r="3.4" opacity=".7" />
      <circle cx="27" cy="28" r="1" fill="currentColor" stroke="none" />
      <path d="M22 35c1.5 1.5 4 2 6 1" opacity=".6" />
    </svg>
  );
}

export function Bangles(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <circle cx="20" cy="24" r="12" />
      <circle cx="28" cy="24" r="12" />
      <circle cx="20" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="28" cy="36" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Kaleera(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <circle cx="24" cy="8" r="4" />
      <path d="M24 12v6m-8 0h16l-3 8h-10l-3-8Z" />
      <path d="M18 26v8m6-8v10m6-10v8" />
      <circle cx="18" cy="36" r="1.6" /><circle cx="24" cy="38" r="1.6" /><circle cx="30" cy="36" r="1.6" />
    </svg>
  );
}

export function Sehra(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M12 10h24l-2 8H14l-2-8Z" />
      <path d="M14 18v20m5-20v22m5-22v24m5-24v22m5-22v20" opacity=".75" />
      <circle cx="14" cy="40" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="24" cy="44" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="34" cy="40" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Mangalsutra(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M8 10c4 10 10 15 16 15s12-5 16-15" />
      <path d="M24 25v5" />
      <circle cx="21" cy="34" r="3" fill="currentColor" stroke="none" />
      <circle cx="27" cy="34" r="3" fill="currentColor" stroke="none" />
      <path d="M10 12c3 8 8 12 14 12" opacity=".4" />
    </svg>
  );
}

export function Sindoor(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M14 40c0-8 4-12 10-12s10 4 10 12H14Z" />
      <path d="M24 28V12" />
      <path d="M24 12c-2-2-2-5 0-7 2 2 2 5 0 7Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Rings(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <circle cx="18" cy="28" r="10" />
      <circle cx="30" cy="28" r="10" />
      <path d="M14 15l4-5 4 5-4 3-4-3Z" />
    </svg>
  );
}

export function Coconut(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <circle cx="24" cy="27" r="13" />
      <path d="M24 14c-3-4-2-8 2-10 1 4 0 8-2 10Zm0 0c3-3 7-3 10 0-3 3-7 3-10 0Zm0 0c-3-3-7-3-10 0 3 3 7 3 10 0Z" opacity=".8" />
      <path d="M18 25c1.5 3 4 5 6 5" opacity=".5" />
    </svg>
  );
}

/* ---------- venues & faith ---------- */

export function Mandap(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M8 42V16M40 42V16M8 16l16-8 16 8" />
      <path d="M8 16h32" />
      <path d="M13 20c2 3 2 6 0 9m22-9c-2 3-2 6 0 9" opacity=".6" />
      <path d="M20 42v-8c0-2.5 1.5-4 4-4s4 1.5 4 4v8" />
      <circle cx="24" cy="8" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MosqueDome(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M10 42V26c0-8 6-14 14-14s14 6 14 14v16" />
      <path d="M24 12V8m0-2v0" />
      <circle cx="24" cy="5" r="1.4" fill="currentColor" stroke="none" />
      <path d="M6 42h36" />
      <path d="M20 42v-6c0-2.5 1.5-4 4-4s4 1.5 4 4v6" />
    </svg>
  );
}

export function Gurudwara(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M12 42V22h24v20" />
      <path d="M16 22c0-6 3-10 8-12 5 2 8 6 8 12" />
      <path d="M24 10V5" />
      <path d="M22 7h4" />
      <path d="M8 42h32" />
      <path d="M20 42v-7c0-2.4 1.6-4 4-4s4 1.6 4 4v7" />
    </svg>
  );
}

export function ChurchBell(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M14 32c0-10 2-18 10-18s10 8 10 18l3 4H11l3-4Z" />
      <path d="M24 14v-4m-2-4h4v4h-4Z" />
      <circle cx="24" cy="40" r="2.4" />
    </svg>
  );
}

export function Dove(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M40 14c-8-2-14 1-18 6l-6-5-6 3 8 6c-3 5-3 10-1 16 8-1 14-5 17-11 5-1 7-5 6-15Z" />
      <path d="M22 26c4-2 8-3 12-2" opacity=".55" />
      <circle cx="34" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Om(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M14 20c-3 0-6 2-6 6 0 5 4 9 10 9 7 0 11-5 11-11 0-4-2-7-6-7-3 0-5 2-5 5s2 5 5 5" />
      <path d="M30 17c3-2 6-2 9 0-1 4-4 6-8 6" />
      <path d="M32 10c2-1 4-1 6 0" opacity=".7" />
      <circle cx="40" cy="6" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Khanda(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <circle cx="24" cy="26" r="9" />
      <path d="M24 6v34" />
      <path d="M24 10c2 3 2 6 0 8m0-8c-2 3-2 6 0 8" />
      <path d="M12 12c-2 8 0 16 5 21m19-21c2 8 0 16-5 21" opacity=".8" />
    </svg>
  );
}

export function CrossOrnate(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M24 8v32M14 18h20" />
      <circle cx="24" cy="8" r="2.4" /><circle cx="24" cy="40" r="2.4" />
      <circle cx="14" cy="18" r="2.4" /><circle cx="34" cy="18" r="2.4" />
    </svg>
  );
}

export function Lotus(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M24 34c-4-4-6-9-6-16 3 2 5 5 6 8 1-3 3-6 6-8 0 7-2 12-6 16Z" />
      <path d="M24 34c-6 0-11-2-15-7 4-1 8 0 11 2m4 5c6 0 11-2 15-7-4-1-8 0-11 2" />
      <path d="M13 38c7 3 15 3 22 0" opacity=".6" />
    </svg>
  );
}

/* ---------- celebration & utility ---------- */

export function Garland(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M4 12c6 10 12 15 20 15s14-5 20-15" />
      {[10, 17, 24, 31, 38].map((x, i) => (
        <circle key={x} cx={x} cy={[19, 24.5, 27, 24.5, 19][i]} r="2.2" opacity=".85" />
      ))}
      <path d="M24 27v6m-3 3.5 3-3.5 3 3.5" opacity=".7" />
    </svg>
  );
}

export function Mithai(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M24 8l14 8-14 8-14-8 14-8Z" />
      <path d="M10 16v12l14 8 14-8V16" />
      <path d="M24 24v12" />
      <circle cx="24" cy="14" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ChaiKulhad(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M12 18h22c3 0 6 2 6 5s-3 5-6 5h-2" />
      <path d="M12 18l2 18c.3 2.3 2 4 4.5 4h9c2.5 0 4.2-1.7 4.5-4l2-18" />
      <path d="M18 12c-1.5-2-1.5-4 0-6m6 6c-1.5-2-1.5-4 0-6m6 6c-1.5-2-1.5-4 0-6" opacity=".65" />
    </svg>
  );
}

export function InvitationScroll(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M12 8h24c2.2 0 4 1.8 4 4s-1.8 4-4 4H12" />
      <path d="M12 8c-2.2 0-4 1.8-4 4s1.8 4 4 4v24c0 2.2 1.8 4 4 4h20c2.2 0 4-1.8 4-4V16" />
      <path d="M18 24h14m-14 6h14m-14 6h8" opacity=".6" />
    </svg>
  );
}

export function HennaCone(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M28 4 12 36c-1.7 3.5.5 8 5 8 2 0 3.8-1 4.6-2.7L36 10l-8-6Z" />
      <path d="M25 12l7 5" opacity=".7" />
      <circle cx="17" cy="39" r="1.2" fill="currentColor" stroke="none" />
      <path d="M40 6c2 0 4 2 4 4" opacity=".5" />
    </svg>
  );
}

export function Toran(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M4 10h40" />
      <path d="M8 10l4 9 4-9m4 0 4 9 4-9m4 0 4 9 4-9" />
      <circle cx="12" cy="22" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="24" cy="22" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="36" cy="22" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Fireworks(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <path d="M24 24 12 12m12 12 12-12M24 24 8 24m16 0 16 0M24 24 12 36m12-12 12 12M24 24v-16m0 16v16" opacity=".85" />
      <circle cx="24" cy="24" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="36" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="36" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="36" cy="36" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function NazarSuraksha(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <circle cx="24" cy="24" r="16" />
      <circle cx="24" cy="24" r="10" opacity=".8" />
      <circle cx="24" cy="24" r="5" opacity=".65" />
      <circle cx="24" cy="24" r="1.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ShaadiCard(p: IconProps) {
  return (
    <svg {...base(p)}><T p={p} />
      <rect x="8" y="10" width="32" height="28" rx="3" />
      <path d="M8 14l16 12 16-12" />
      <circle cx="24" cy="30" r="3" opacity=".7" />
    </svg>
  );
}

/** Icon registry — powers the /design-system/icons gallery. */
export const icons = {
  shehnai: Shehnai,
  dhol: Dhol,
  "baraat-horse": BaraatHorse,
  doli: Doli,
  "band-baaja": BandBaaja,
  varmala: Varmala,
  "mehndi-hand": MehndiHand,
  bangles: Bangles,
  kaleera: Kaleera,
  sehra: Sehra,
  mangalsutra: Mangalsutra,
  sindoor: Sindoor,
  rings: Rings,
  coconut: Coconut,
  mandap: Mandap,
  "mosque-dome": MosqueDome,
  gurudwara: Gurudwara,
  "church-bell": ChurchBell,
  dove: Dove,
  om: Om,
  khanda: Khanda,
  "cross-ornate": CrossOrnate,
  lotus: Lotus,
  garland: Garland,
  mithai: Mithai,
  "chai-kulhad": ChaiKulhad,
  "invitation-scroll": InvitationScroll,
  "henna-cone": HennaCone,
  toran: Toran,
  fireworks: Fireworks,
  nazar: NazarSuraksha,
  "shaadi-card": ShaadiCard,
} as const;

export type IconName = keyof typeof icons;
