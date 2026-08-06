import type { MonogramRing } from "@/themes";

/**
 * SVG monogram from two initials inside a theme-aware decorative ring
 * (paisley / jaali / floral / laurel). Inherits currentColor.
 * @example <CoupleMonogram initials={["S","P"]} ring="paisley" className="size-24 text-accent" />
 */
export function CoupleMonogram({
  initials,
  ring = "paisley",
  className = "",
  title,
}: {
  initials: [string, string];
  ring?: MonogramRing;
  className?: string;
  title?: string;
}) {
  const n = ring === "jaali" ? 8 : ring === "laurel" ? 14 : ring === "floral" ? 10 : 12;
  return (
    <svg viewBox="0 0 120 120" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <circle cx="60" cy="60" r="44" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="60" cy="60" r="49" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      {Array.from({ length: n }).map((_, i) => {
        const a = (i * 360) / n;
        if (ring === "jaali")
          return <rect key={i} x="57" y="4" width="6" height="6" rx="1" transform={`rotate(${a + 22} 60 60) rotate(45 60 7)`} fill="currentColor" opacity="0.8" />;
        if (ring === "laurel")
          return <ellipse key={i} cx="60" cy="8" rx="2.2" ry="5" transform={`rotate(${a} 60 60) rotate(28 60 8)`} fill="currentColor" opacity="0.75" />;
        if (ring === "floral")
          return (
            <g key={i} transform={`rotate(${a} 60 60)`}>
              <circle cx="60" cy="8" r="3" fill="currentColor" opacity="0.8" />
              <circle cx="60" cy="8" r="1.2" fill="var(--color-bg)" />
            </g>
          );
        // paisley ring: small comma strokes
        return <path key={i} d="M60 4c3 2 3 6 0 8-2-1.5-2.5-5.5 0-8Z" transform={`rotate(${a} 60 60)`} fill="currentColor" opacity="0.85" />;
      })}
      <text
        x="60"
        y="66"
        textAnchor="middle"
        fontFamily="var(--font-display), serif"
        fontSize="34"
        fontWeight="600"
        fill="currentColor"
      >
        {initials[0]}
        <tspan fontSize="20" dy="-2" opacity="0.7">
          {" & "}
        </tspan>
        <tspan dy="2">{initials[1]}</tspan>
      </text>
    </svg>
  );
}
