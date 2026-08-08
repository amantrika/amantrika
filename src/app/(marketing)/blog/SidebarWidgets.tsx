"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Copy, IndianRupee, Share2 } from "lucide-react";
import { CardToLink, OfferedByHand } from "@/design-system/icons/mission";

/**
 * The two promotional widgets in the blog sidebar.
 *
 * Client components, which is a deliberate exception to the server-first rule:
 * both are animated, and the animation is the point — a static square in a
 * sidebar is furniture, a moving one gets looked at. They are confined to the
 * marketing surface and never load on the guest invitation route, where the
 * 100KB budget lives.
 *
 * Both respect `prefers-reduced-motion`: with it set, everything below renders
 * in its final state with no looping animation.
 */

/* -------------------------------------------------- create-your-own square */

/**
 * A square card with a card-to-link animation looping inside it: an envelope
 * seal pulses, petals drift, and the CTA sits underneath.
 */
export function CreateYourOwnWidget() {
  const reduced = useReducedMotion();

  // Fixed offsets rather than random ones, so server and client markup match.
  const petals = [
    { x: -34, delay: 0, size: 7 },
    { x: -12, delay: 1.1, size: 5 },
    { x: 14, delay: 0.5, size: 8 },
    { x: 36, delay: 1.7, size: 6 },
  ];

  return (
    <section
      aria-labelledby="widget-create"
      className="relative overflow-hidden rounded-card border border-ornate bg-gradient-to-br from-accent/12 via-surface to-primary/8 p-5"
    >
      {/* Animated stage */}
      <div className="relative mx-auto aspect-square w-full max-w-[13rem]">
        {!reduced &&
          petals.map((petal) => (
            <motion.span
              key={petal.x}
              aria-hidden
              className="absolute left-1/2 top-0 rounded-full bg-accent/50"
              style={{ width: petal.size, height: petal.size }}
              initial={{ y: -10, x: petal.x, opacity: 0, rotate: 0 }}
              animate={{ y: 200, x: petal.x + 14, opacity: [0, 1, 1, 0], rotate: 220 }}
              transition={{
                duration: 6,
                delay: petal.delay,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}

        {/* The card, breathing */}
        <motion.div
          className="absolute inset-x-6 top-8 rounded-soft border border-ornate/70 bg-surface p-4 shadow-resting"
          animate={reduced ? undefined : { y: [0, -6, 0], rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <p className="type-script text-center text-lg text-primary">You&apos;re invited</p>
          <span aria-hidden className="mx-auto mt-1 block h-px w-12 bg-ornate/60" />
          <div aria-hidden className="mt-3 space-y-1.5">
            <span className="block h-1.5 w-3/4 rounded-full bg-foreground/12" />
            <span className="block h-1.5 w-full rounded-full bg-foreground/12" />
            <span className="block h-1.5 w-1/2 rounded-full bg-foreground/12" />
          </div>
        </motion.div>

        {/* Wax seal, pulsing */}
        <motion.span
          aria-hidden
          className="absolute bottom-10 left-1/2 inline-flex size-12 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-bg shadow-gold-glow"
          animate={reduced ? undefined : { scale: [1, 1.08, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <CardToLink className="size-6" />
        </motion.span>
      </div>

      <h3 id="widget-create" className="mt-2 text-center type-h3 text-primary">
        Create your own wedding site
      </h3>
      <p className="mt-1 text-center type-caption">
        Pick a theme, add your details, share one link. About fifteen minutes.
      </p>

      <Link
        href="/signup"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-soft border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-bg transition-shadow hover:shadow-gold-glow"
      >
        Start free
        <ArrowRight aria-hidden className="size-4" />
      </Link>
      <p className="mt-2 text-center type-caption">No card needed to build it.</p>
    </section>
  );
}

/* ------------------------------------------------------- earn by promoting */

/**
 * The referral widget. Coins rise past a share icon on a loop; the copy is
 * about recommending the product to couples you already know.
 *
 * No earnings figure is shown, because the commission rate is not settled —
 * inventing "earn ₹5,000/month" here would be exactly the fabricated-social-
 * proof problem this rebuild is removing.
 */
export function EarnByPromotingWidget() {
  const reduced = useReducedMotion();
  const coins = [0, 0.8, 1.6];

  return (
    <section
      aria-labelledby="widget-earn"
      className="relative overflow-hidden rounded-card border border-ornate/50 bg-surface p-5"
    >
      <div className="flex items-start gap-3">
        <span className="relative inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-ornate bg-accent/12 text-primary">
          <Share2 aria-hidden className="size-5" />
          {!reduced &&
            coins.map((delay) => (
              <motion.span
                key={delay}
                aria-hidden
                className="absolute inline-flex items-center justify-center text-accent"
                initial={{ y: 6, opacity: 0, scale: 0.6 }}
                animate={{ y: -26, opacity: [0, 1, 0], scale: 1 }}
                transition={{ duration: 2.4, delay, repeat: Infinity, ease: "easeOut" }}
              >
                <IndianRupee className="size-3.5" />
              </motion.span>
            ))}
        </span>

        <div className="min-w-0">
          <h3 id="widget-earn" className="type-h3 text-primary">
            Earn by recommending us
          </h3>
          <p className="mt-1 type-caption">
            Know a couple planning a wedding? Share your link and earn a commission on every
            invitation they publish.
          </p>
        </div>
      </div>

      {/* A referral link, shown as the thing you would actually be given. */}
      <div
        aria-hidden
        className="mt-4 flex items-center gap-2 rounded-soft border border-dashed border-ornate/60 bg-bg px-3 py-2"
      >
        <span className="truncate font-mono text-xs text-muted">amantrika.com/?ref=you</span>
        <Copy className="ml-auto size-3.5 shrink-0 text-accent" />
      </div>

      <Link
        href="/signup?intent=partner"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-soft border border-ornate px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-accent/10"
      >
        <OfferedByHand aria-hidden className="size-4" />
        Become a promoter
      </Link>
      <p className="mt-2 text-center type-caption">
        Planners, printers and photographers welcome.
      </p>
    </section>
  );
}
