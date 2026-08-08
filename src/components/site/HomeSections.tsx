"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button, Card } from "@/design-system/components";
import {
  AcrossOceans,
  CardToLink,
  CraftedByHand,
  FairPrice,
  FineFinish,
  ManyScripts,
  MinutesNotWeeks,
  OfferedByHand,
  Sapling,
  SeenAndCounted,
} from "@/design-system/icons/mission";
import { fadeUpStagger, staggerContainer } from "@/design-system/motion/presets";

/**
 * Homepage sections carrying the copy from amantrika.com, expanded.
 *
 * The wording in "What we offer", "Why choose us" and the closing call to
 * action is the live site's own, kept close to verbatim so the rebuild reads
 * as the same company. What is new is the structure: icons from our own set,
 * imagery, and sections that were previously plain lists.
 *
 * Client components because of the scroll-in animation. They sit on the
 * marketing surface only — never on the guest invitation route.
 */

/** Shared scroll-triggered wrapper. Animates once, respects reduced motion. */
function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* --------------------------------------------------------- what we offer */

const offerings = [
  {
    icon: CardToLink,
    title: "Create a unique experience",
    text: "Break away from the monotony of traditional physical and video invitations. Opt for a modern and trendy option, and make an impression by crafting extraordinary moments that reflect your distinct style.",
  },
  {
    icon: ManyScripts,
    title: "Multilingual invitations",
    text: "Craft invitations in your preferred language, so you can share your special moments in the language that resonates with you and your guests.",
    badge: "Coming soon",
  },
  {
    icon: SeenAndCounted,
    title: "Smart and tech-savvy",
    text: "Seamless integration for venue details and transportation options, making planning effortless for your guests instead of a series of phone calls to you.",
  },
  {
    icon: FineFinish,
    title: "High-quality design",
    text: "Immerse your guests in sophistication with design where every detail is thoughtfully crafted to not only meet but exceed your expectations, and leave an enduring impression.",
  },
  {
    icon: Sapling,
    title: "Eco-friendly approach",
    text: "Choosing digital is a conscientious step to reduce the environmental impact associated with paper production and waste, aligning your celebration with a greener tomorrow.",
  },
  {
    icon: FairPrice,
    title: "Affordable",
    text: "Say goodbye to the hassle and expense of traditional cards. A pocket-friendly and feasible alternative, without compromising on style or quality.",
  },
] as const;

export function WhatWeOffer() {
  return (
    <section id="what-we-offer" className="mx-auto max-w-6xl px-4 py-20">
      <Reveal className="text-center">
        <motion.p variants={fadeUpStagger} className="type-overline text-accent">
          What we offer
        </motion.p>
        <motion.h2
          variants={fadeUpStagger}
          custom={1}
          className="mx-auto mt-2 max-w-2xl type-display-lg text-primary"
        >
          Digital elegance and a modern invitation experience
        </motion.h2>
      </Reveal>

      <Reveal className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {offerings.map(({ icon: Icon, title, text, ...rest }, i) => (
          <motion.div key={title} variants={fadeUpStagger} custom={i % 3}>
            <Card variant="envelope" className="h-full p-7">
              <span className="inline-flex size-14 items-center justify-center rounded-full border border-ornate/60 bg-accent/10 text-primary">
                <Icon className="size-7" />
              </span>
              <h3 className="mt-4 flex flex-wrap items-center gap-2 type-h2 text-primary">
                {title}
                {"badge" in rest && rest.badge && (
                  <span className="rounded-full border border-ornate/60 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-accent">
                    {rest.badge}
                  </span>
                )}
              </h3>
              <p className="mt-2 type-body text-muted">{text}</p>
            </Card>
          </motion.div>
        ))}
      </Reveal>
    </section>
  );
}

/* ---------------------------------------------------------- why choose us */

const benefits = [
  {
    icon: MinutesNotWeeks,
    title: "Quick and effortless creation",
    text: "Create your invitation in minutes — enter your details and it is done.",
  },
  {
    icon: OfferedByHand,
    title: "Support and service",
    text: "From creating the invitation to sending it, we are here at every step.",
  },
  {
    icon: CraftedByHand,
    title: "User-friendly interface",
    text: "Easy to use. Anyone can create an invitation without any technical knowledge.",
  },
  {
    icon: AcrossOceans,
    title: "Professional quality",
    text: "High-quality designs that make your invitation stand out in the crowd.",
  },
] as const;

export function WhyChooseUs() {
  return (
    <section id="why-choose-us" className="bg-surface py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
        <Reveal>
          <motion.p variants={fadeUpStagger} className="type-overline text-accent">
            Why choose us
          </motion.p>
          <motion.h2 variants={fadeUpStagger} custom={1} className="mt-2 type-display-lg text-primary">
            Beyond the basics
          </motion.h2>
          <motion.p variants={fadeUpStagger} custom={2} className="mt-4 type-body-lg text-muted">
            We create invitations as special as your day. We are your dedicated partner in crafting
            unforgettable moments, with a focus on simplicity, elegance and timeless aesthetics.
          </motion.p>

          <motion.ul variants={fadeUpStagger} custom={3} className="mt-8 space-y-5">
            {benefits.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="mt-0.5 inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-ornate/60 bg-accent/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="type-h3 text-foreground">{title}</p>
                  <p className="mt-0.5 type-body text-muted">{text}</p>
                </div>
              </li>
            ))}
          </motion.ul>

          <motion.div variants={fadeUpStagger} custom={4} className="mt-8">
            <Link href="/signup">
              <Button size="lg" variant="celebration">
                Let&apos;s start
              </Button>
            </Link>
          </motion.div>
        </Reveal>

        <Reveal className="grid grid-cols-2 gap-4">
          {[
            { src: "/assets/home/feature-design.png", alt: "A cream invitation card with a fine gold rule" },
            { src: "/assets/home/feature-multilingual.png", alt: "A teal invitation card framed in rose gold" },
            { src: "/assets/home/feature-eco.png", alt: "A haldi-yellow invitation card with a marigold border" },
            { src: "/assets/home/feature-smart.png", alt: "A green invitation card with a gold frame" },
          ].map((image, i) => (
            <motion.figure key={image.src} variants={fadeUpStagger} custom={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.src}
                alt={image.alt}
                width={900}
                height={700}
                loading="lazy"
                className={`w-full rounded-card border border-ornate/30 object-cover ${
                  i % 2 ? "mt-6" : ""
                }`}
              />
            </motion.figure>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ latest blog */

export interface HomePostSummary {
  title: string;
  href: string;
  excerpt: string;
  category: string;
  author: string;
  readingTime: number;
  coverImage?: string;
  coverAlt?: string;
}

export function LatestBlogs({ posts }: { posts: HomePostSummary[] }) {
  if (posts.length === 0) return null;

  return (
    <section id="latest-blogs" className="mx-auto max-w-6xl px-4 py-20">
      <Reveal className="text-center">
        <motion.p variants={fadeUpStagger} className="type-overline text-accent">
          Our latest blogs
        </motion.p>
        <motion.h2 variants={fadeUpStagger} custom={1} className="mt-2 type-display-lg text-primary">
          Catch up on our latest articles and updates
        </motion.h2>
      </Reveal>

      <Reveal className="mt-12 grid gap-6 md:grid-cols-3">
        {posts.map((post, i) => (
          <motion.article
            key={post.href}
            variants={fadeUpStagger}
            custom={i}
            className="group relative flex flex-col overflow-hidden rounded-card border border-ornate/30 bg-surface transition-shadow hover:shadow-resting"
          >
            {post.coverImage && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={post.coverImage}
                alt={post.coverAlt ?? ""}
                width={1200}
                height={630}
                loading="lazy"
                className="h-40 w-full object-cover"
              />
            )}
            <div className="flex flex-1 flex-col p-6">
              <p className="type-overline text-accent">{post.category}</p>
              <h3 className="mt-2 type-h3 text-primary">
                <Link href={post.href} className="after:absolute after:inset-0 after:content-['']">
                  {post.title}
                </Link>
              </h3>
              <p className="mt-2 flex-1 type-body text-muted">{post.excerpt}</p>
              <p className="mt-4 type-caption">
                {post.author} · {post.readingTime} min read
              </p>
            </div>
          </motion.article>
        ))}
      </Reveal>

      <div className="mt-10 text-center">
        <Link href="/blog">
          <Button variant="secondary">Read all posts</Button>
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- faq */

/**
 * The questions people actually type into a search box, answered on the page.
 *
 * These are the same items the page emits as FAQPage structured data. They
 * must stay visible: structured data describing answers a visitor cannot see
 * is a guidelines violation, and it is also just dishonest.
 *
 * Rendered as <details> rather than a JS accordion so every answer is in the
 * HTML, expandable without hydration, and readable by anything that fetches
 * the page.
 */
export function HomeFaq({ items }: { items: { q: string; a: string }[] }) {
  if (items.length === 0) return null;

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20">
      <Reveal className="text-center">
        <motion.p variants={fadeUpStagger} className="type-overline text-accent">
          Questions
        </motion.p>
        <motion.h2 variants={fadeUpStagger} custom={1} className="mt-2 type-display-lg text-primary">
          Everything people ask us first
        </motion.h2>
      </Reveal>

      <div className="mt-10 divide-y divide-ornate/30 rounded-card border border-ornate/40 bg-surface">
        {items.map((item) => (
          <details key={item.q} className="group px-6 py-5">
            <summary className="flex cursor-pointer items-center justify-between gap-4 type-h3 text-primary marker:content-['']">
              {item.q}
              <span
                aria-hidden
                className="shrink-0 text-accent transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 type-body text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------------------------------- ready to create */

/**
 * Mid-page conversion band. Deliberately makes no claim about how many couples
 * have used the product — the live site's "join thousands of couples" line is
 * the one thing here we have not carried over, because we cannot stand it up.
 */
export function ReadyToCreate({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative overflow-hidden border-y border-ornate/40 bg-accent/8 py-20">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <Reveal>
          <motion.h2 variants={fadeUpStagger} className="type-display-lg text-primary">
            Ready to create your invitation?
          </motion.h2>
          <motion.p
            variants={fadeUpStagger}
            custom={1}
            className="mx-auto mt-4 max-w-xl type-body-lg text-muted"
          >
            Share your special day with one link — your names, your ceremonies, your language, and
            everyone you want beside you.
          </motion.p>
          <motion.div
            variants={fadeUpStagger}
            custom={2}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            <Link href={signedIn ? "/onboarding" : "/signup"}>
              <Button size="lg" variant="celebration">
                Start creating now
              </Button>
            </Link>
            <Link href="/blog/step-by-step-guide-to-create-wedding-website">
              <Button size="lg" variant="secondary">
                Read the guide first
              </Button>
            </Link>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
