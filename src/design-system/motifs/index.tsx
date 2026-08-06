import type { SVGProps } from "react";

/**
 * Amantrika decorative motifs. Every motif is a small inline SVG that
 * inherits `currentColor`, so themes recolor them via text color utilities.
 * Usage: <Paisley className="w-6 h-6 text-accent" />
 */
export type MotifProps = SVGProps<SVGSVGElement> & { title?: string };

function base(props: MotifProps) {
  const { title, ...rest } = props;
  return {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 48 48",
    width: 32,
    height: 32,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": title ? undefined : true,
    role: title ? "img" : undefined,
    ...rest,
  };
}

export function Paisley(props: MotifProps) {
  return (
    <svg {...base(props)}>
      {props.title && <title>{props.title}</title>}
      <path d="M24 42c-9 0-15-6.5-15-14.5C9 17 16 6 27 6c7 0 12 5 12 11 0 7-6 10-11 10-4 0-7-2.5-7-6 0-2.8 2-5 5-5" />
      <path d="M27 12c-5.5 1-9.5 5.5-9.5 11 0 6 4.5 10 10 10" opacity=".5" />
    </svg>
  );
}

export function MangoLeaf(props: MotifProps) {
  return (
    <svg {...base(props)}>
      {props.title && <title>{props.title}</title>}
      <path d="M24 44C13 38 8 28 10 16c8-6 18-6 28 0 2 12-3 22-14 28Z" />
      <path d="M24 44V16m0 10-8-6m8 14-9-7m9-1 8-6m-8 14 9-7" opacity=".6" />
    </svg>
  );
}

export function Marigold(props: MotifProps) {
  return (
    <svg {...base(props)}>
      {props.title && <title>{props.title}</title>}
      <circle cx="24" cy="24" r="5" fill="currentColor" stroke="none" />
      {Array.from({ length: 8 }).map((_, i) => (
        <ellipse
          key={i}
          cx="24"
          cy="12.5"
          rx="4.5"
          ry="7.5"
          transform={`rotate(${i * 45} 24 24)`}
        />
      ))}
    </svg>
  );
}

export function Diya(props: MotifProps) {
  return (
    <svg {...base(props)}>
      {props.title && <title>{props.title}</title>}
      <path d="M10 30h28c-1 6-7 10-14 10s-13-4-14-10Z" />
      <path d="M14 30c2-2 6-3 10-3s8 1 10 3" opacity=".5" />
      <path d="M24 24c3-2.5 3.5-6 1.5-9.5C22 12 22.5 9 24 7c-4.5 2-7 6.5-5.5 10.5.8 2.4 3 4.5 5.5 6.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Kalash(props: MotifProps) {
  return (
    <svg {...base(props)}>
      {props.title && <title>{props.title}</title>}
      <path d="M17 18h14c3 3.5 5 7 5 11 0 6.5-5.5 11-12 11s-12-4.5-12-11c0-4 2-7.5 5-11Z" />
      <path d="M16 18c0-2.5 3.5-4 8-4s8 1.5 8 4" />
      <path d="M24 14c-2.8 0-4.5-2-4.5-4M24 14c2.8 0 4.5-2 4.5-4M24 14V8" />
      <circle cx="24" cy="6.5" r="1.6" fill="currentColor" stroke="none" />
      <path d="M13 29h22" opacity=".5" />
    </svg>
  );
}

export function PeacockFeather(props: MotifProps) {
  return (
    <svg {...base(props)}>
      {props.title && <title>{props.title}</title>}
      <ellipse cx="24" cy="16" rx="9" ry="12" />
      <ellipse cx="24" cy="16" rx="4.5" ry="6.5" opacity=".6" />
      <circle cx="24" cy="16" r="2" fill="currentColor" stroke="none" />
      <path d="M24 28c0 6-1 11-3 14m3-14c1.5 4 1.5 9 .5 14m-.5-14c-3 2-6 2.5-9 2m9-2c3 2 6 2.5 9 2" opacity=".7" />
    </svg>
  );
}

export function MehndiCorner(props: MotifProps) {
  return (
    <svg {...base(props)}>
      {props.title && <title>{props.title}</title>}
      <path d="M4 4h18c0 10-8 18-18 18V4Z" />
      <path d="M4 4c8 2 14 8 16 16" opacity=".6" />
      <circle cx="10" cy="10" r="2.4" />
      <path d="M28 4c4 0 8 1 11 4M4 28c0 4 1 8 4 11" opacity=".8" />
      <circle cx="34" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="34" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function JaaliPattern(props: MotifProps) {
  return (
    <svg {...base(props)}>
      {props.title && <title>{props.title}</title>}
      <path d="M12 6c0 4-4 6-4 10s4 6 4 10-4 6-4 10m12-36c0 4-4 6-4 10s4 6 4 10-4 6-4 10m12-30c0 4-4 6-4 10s4 6 4 10-4 6-4 10m12-36c0 4-4 6-4 10s4 6 4 10-4 6-4 10" opacity=".9" />
      <path d="M6 12h36M6 24h36M6 36h36" opacity=".4" />
    </svg>
  );
}

export function CrescentStar(props: MotifProps) {
  return (
    <svg {...base(props)}>
      {props.title && <title>{props.title}</title>}
      <path d="M30 6a18 18 0 1 0 0 36 15 15 0 0 1-9-13.5A15 15 0 0 1 30 6Z" />
      <path d="M34 20l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5L34 20Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ChurchArch(props: MotifProps) {
  return (
    <svg {...base(props)}>
      {props.title && <title>{props.title}</title>}
      <path d="M10 42V22c0-9 6-16 14-16s14 7 14 16v20" />
      <path d="M16 42V24c0-6 3.5-10 8-10s8 4 8 10v18" opacity=".55" />
      <path d="M6 42h36" />
    </svg>
  );
}

export function FloralCross(props: MotifProps) {
  return (
    <svg {...base(props)}>
      {props.title && <title>{props.title}</title>}
      <path d="M24 8v32M12 20h24" />
      <circle cx="24" cy="8" r="3" /><circle cx="24" cy="40" r="3" />
      <circle cx="12" cy="20" r="3" /><circle cx="36" cy="20" r="3" />
      <path d="M20 28c-4 2-6 6-6 10 4 0 8-2 10-6m0-4c4 2 6 6 6 10-4 0-8-2-10-6" opacity=".6" />
    </svg>
  );
}

export function OliveBranch(props: MotifProps) {
  return (
    <svg {...base(props)}>
      {props.title && <title>{props.title}</title>}
      <path d="M8 40C16 32 24 20 40 8" />
      <path d="M18 30c-4-1-6-4-6-8 4 0 7 2 8 6m2-8c-3-2-4-6-3-10 4 1 6 4 6 8m4-2c-1-4 1-8 4-10 2 3 2 7 0 10" opacity=".8" />
      <circle cx="14" cy="36" r="2" fill="currentColor" stroke="none" />
      <circle cx="22" cy="34" r="2" fill="currentColor" stroke="none" opacity=".6" />
    </svg>
  );
}

/** Registry used by the design-system docs gallery and theme motifSets. */
export const motifs = {
  paisley: Paisley,
  "mango-leaf": MangoLeaf,
  marigold: Marigold,
  diya: Diya,
  kalash: Kalash,
  "peacock-feather": PeacockFeather,
  "mehndi-corner": MehndiCorner,
  "jaali-pattern": JaaliPattern,
  "crescent-star": CrescentStar,
  "church-arch": ChurchArch,
  "floral-cross": FloralCross,
  "olive-branch": OliveBranch,
} as const;

export type MotifName = keyof typeof motifs;
