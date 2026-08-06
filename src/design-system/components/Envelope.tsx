"use client";

import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { WaxSeal } from "./WaxSeal";
import { envelopeOpen, cardSlideOut } from "../motion/presets";

/**
 * Interactive envelope. Closed: guest name in Display italic + WaxSeal.
 * On click/tap: seal breaks, flap opens in 3D, the card slides out.
 * Under reduced motion everything resolves instantly.
 * @example
 * <Envelope guestName="Rahul & Family" sealMonogram="S·P" onOpened={fn}>
 *   <InviteCard />
 * </Envelope>
 */
export function Envelope({
  guestName,
  sealMonogram,
  onOpened,
  children,
  autoPlay = false,
  className = "",
}: {
  guestName?: string;
  sealMonogram: string;
  onOpened?: () => void;
  /** card content revealed when opened */
  children?: ReactNode;
  /** opens by itself after a beat (landing-page demo) */
  autoPlay?: boolean;
  className?: string;
}) {
  const [opened, setOpened] = useState(false);
  const reduced = useReducedMotion();

  const open = () => {
    if (opened) return;
    setOpened(true);
    // fire after the flap+card sequence (or immediately when reduced)
    setTimeout(() => onOpened?.(), reduced ? 50 : 1600);
  };

  return (
    <div className={`relative mx-auto w-full max-w-md ${className}`} style={{ perspective: 1200 }}>
      <motion.button
        onClick={open}
        onAnimationComplete={autoPlay && !opened ? open : undefined}
        initial={autoPlay ? { opacity: 0 } : false}
        animate={autoPlay ? { opacity: 1, transition: { duration: 0.8, delay: 0.6 } } : undefined}
        aria-label={opened ? "Invitation opened" : `Open invitation${guestName ? ` for ${guestName}` : ""}`}
        className="relative block w-full cursor-pointer text-left"
        disabled={opened}
      >
        {/* envelope body */}
        <div
          className="relative aspect-[7/5] w-full rounded-soft border border-ornate/60 bg-surface shadow-envelope"
          style={{ padding: "var(--space-envelope-inset)" }}
        >
          {/* inner card peeking / sliding out */}
          <motion.div
            variants={cardSlideOut}
            initial="inside"
            animate={opened ? "out" : "inside"}
            className="absolute inset-x-4 top-3 bottom-3 overflow-hidden rounded-soft bg-raised shadow-resting ornate-border"
          >
            {children ?? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                <span className="type-overline">You are invited</span>
                <span className="type-h2 text-primary">Save the Date</span>
              </div>
            )}
          </motion.div>

          {/* side folds */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-soft"
            style={{
              background:
                "linear-gradient(105deg, color-mix(in srgb, var(--color-border-ornate) 14%, transparent) 0%, transparent 30%), linear-gradient(-105deg, color-mix(in srgb, var(--color-border-ornate) 14%, transparent) 0%, transparent 30%)",
            }}
          />

          {/* flap */}
          <motion.div
            variants={envelopeOpen}
            initial="closed"
            animate={opened ? "open" : "closed"}
            style={{ transformOrigin: "top center", transformStyle: "preserve-3d" }}
            className={`absolute inset-x-0 top-0 h-1/2 ${opened ? "z-0" : "z-10"}`}
          >
            <div
              className="size-full rounded-t-soft border-x border-t border-ornate/60"
              style={{
                clipPath: "polygon(0 0, 100% 0, 50% 96%)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 10%, var(--color-surface)) 0%, var(--color-surface) 85%)",
              }}
            />
          </motion.div>

          {/* guest name + seal on the closed face */}
          {!opened && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-end gap-2 pb-5">
              {guestName && (
                <p className="type-verse text-primary" style={{ fontSize: "1.35rem" }}>
                  {guestName}
                </p>
              )}
              <span className="type-overline">Tap the seal to open</span>
            </div>
          )}
          <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
            <WaxSeal monogram={sealMonogram} broken={opened} size={76} />
          </div>
        </div>
      </motion.button>
    </div>
  );
}
