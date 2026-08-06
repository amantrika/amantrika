"use client";

import { motion } from "framer-motion";
import { sealBreak } from "../motion/presets";

/**
 * Pressed-wax seal with a couple monogram. Renders in --color-primary wax
 * with radial-gradient depth; animates the "seal-break" preset when broken.
 * @example <WaxSeal monogram="S♥P" broken={opened} size={88} />
 */
export function WaxSeal({
  monogram,
  broken = false,
  size = 88,
  className = "",
}: {
  monogram: string;
  broken?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <motion.div
      variants={sealBreak}
      initial="intact"
      animate={broken ? "broken" : "intact"}
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* irregular wax blob */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: "48% 52% 50% 50% / 52% 48% 52% 48%",
          background:
            "radial-gradient(circle at 32% 30%, color-mix(in srgb, var(--color-primary) 72%, white) 0%, var(--color-primary) 42%, color-mix(in srgb, var(--color-primary) 70%, black) 100%)",
          boxShadow: "inset 0 -3px 8px rgba(0,0,0,.35), inset 0 3px 6px rgba(255,255,255,.22), 0 3px 10px rgba(0,0,0,.3)",
        }}
      />
      {/* pressed ring + monogram */}
      <div
        className="relative flex items-center justify-center rounded-full border font-display font-semibold"
        style={{
          width: size * 0.66,
          height: size * 0.66,
          borderColor: "color-mix(in srgb, var(--color-bg) 55%, transparent)",
          color: "var(--color-bg)",
          fontSize: size * 0.26,
          textShadow: "0 1px 2px rgba(0,0,0,.4)",
          boxShadow: "inset 0 2px 5px rgba(0,0,0,.3)",
        }}
      >
        {monogram}
      </div>
    </motion.div>
  );
}
