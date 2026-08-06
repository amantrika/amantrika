"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { PetalType } from "@/themes";
import { petalFall } from "../motion/presets";

const petalColor: Record<Exclude<PetalType, "none">, string> = {
  marigold: "var(--color-accent)",
  rose: "var(--color-primary)",
  jasmine: "var(--color-surface-raised)",
  confetti: "var(--color-accent)",
};

/**
 * Ambient falling petals (absolutely-positioned SVGs). Density is petal
 * count; auto-disabled under reduced motion. Theme decides the petal type.
 * @example <PetalRain type="marigold" density={14} />
 */
export function PetalRain({
  type = "marigold",
  density = 14,
  className = "",
}: {
  type?: PetalType;
  density?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const petals = useMemo(
    () =>
      Array.from({ length: density }, (_, i) => ({
        left: `${(i * 97) % 100}%`,
        size: 10 + ((i * 53) % 12),
        i,
      })),
    [density]
  );

  if (reduced || type === "none") return null;

  return (
    <div aria-hidden className={`pointer-events-none fixed inset-0 z-40 overflow-hidden ${className}`}>
      {petals.map((p) => (
        <motion.svg
          key={p.i}
          custom={p.i}
          variants={petalFall}
          initial={{ y: -40 }}
          animate="falling"
          className="absolute -top-10"
          style={{ left: p.left, width: p.size, height: p.size, color: petalColor[type], opacity: 0.75 }}
          viewBox="0 0 20 20"
        >
          {type === "confetti" ? (
            <rect x="4" y="4" width="12" height="7" rx="1" fill="currentColor" />
          ) : (
            <path d="M10 1C14 5 16 9 15 14c-1 4-4 5-5 5s-4-1-5-5C4 9 6 5 10 1Z" fill="currentColor" />
          )}
        </motion.svg>
      ))}
    </div>
  );
}
