import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/design-system/components/Button";
import { missionIcons, type MissionIconName } from "@/design-system/icons/mission";
import { icons as weddingIcons } from "@/design-system/icons";

/**
 * Section blocks for MDX pages.
 *
 * These exist so a page like /about is composed of designed sections rather
 * than paragraphs of plain text — mission, values, milestones and pull quotes
 * each get a shape, an icon and a rhythm, and the writer picks them by name.
 *
 * All server components. Every icon is an inline SVG from our own set, so
 * there is no icon font, no sprite request and no client JS.
 */

/** Resolves a name from either icon set, so authors need not know which is which. */
function resolveIcon(name: string) {
  const registry = { ...weddingIcons, ...missionIcons } as Record<
    string,
    (props: { className?: string }) => ReactNode
  >;
  const Icon = registry[name];
  if (!Icon) {
    throw new Error(
      `Unknown icon "${name}". Available: ${Object.keys(registry).sort().join(", ")}`
    );
  }
  return Icon;
}

/* ------------------------------------------------------------ section shell */

/**
 * A titled band. `tone="tinted"` gives it a full-bleed background so
 * consecutive sections read as distinct areas rather than one long column.
 */
export function Section({
  eyebrow,
  title,
  lead,
  tone = "plain",
  children,
}: {
  eyebrow?: string;
  title?: string;
  lead?: string;
  tone?: "plain" | "tinted" | "ornate";
  children: ReactNode;
}) {
  const toneCls = {
    plain: "",
    tinted: "bg-accent/6 border-y border-ornate/25",
    ornate: "bg-surface border-y border-ornate/40",
  }[tone];

  return (
    // Negative margin breaks out of the prose column to full content width.
    <section className={`my-16 -mx-4 px-4 py-12 sm:-mx-8 sm:px-8 ${toneCls}`}>
      {(eyebrow || title || lead) && (
        <header className="mx-auto max-w-2xl text-center">
          {eyebrow && <p className="type-overline text-accent">{eyebrow}</p>}
          {title && <h2 className="mt-2 type-h2 scroll-mt-28 text-primary">{title}</h2>}
          {lead && <p className="mt-3 type-body-lg text-muted">{lead}</p>}
        </header>
      )}
      <div className={eyebrow || title || lead ? "mt-10" : ""}>{children}</div>
    </section>
  );
}

/* --------------------------------------------------------------- icon cards */

export interface IconCardProps {
  icon: string;
  title: string;
  children: ReactNode;
}

/**
 * One value or capability. The icon sits in a gold-ruled medallion, which is
 * the same visual device the invitation themes use for monograms — the
 * marketing site and the product should look related.
 */
export function IconCard({ icon, title, children }: IconCardProps) {
  const Icon = resolveIcon(icon);

  return (
    <article className="group relative rounded-card border border-ornate/35 bg-surface p-6 transition-shadow hover:shadow-resting">
      <span className="inline-flex size-14 items-center justify-center rounded-full border border-ornate/60 bg-accent/10 text-primary transition-colors group-hover:bg-accent/20">
        <Icon className="size-7" />
      </span>
      <h3 className="mt-4 type-h3 text-primary">{title}</h3>
      <div className="mt-2 type-body text-muted [&>p:first-child]:mt-0">{children}</div>
    </article>
  );
}

/** Responsive grid for IconCards. `columns` caps the widest breakpoint. */
export function IconGrid({
  columns = 3,
  children,
}: {
  columns?: 2 | 3 | 4;
  children: ReactNode;
}) {
  const cols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return <div className={`grid gap-5 ${cols}`}>{children}</div>;
}

/* ------------------------------------------------------------- mission band */

/**
 * The mission statement. One sentence, set large, framed by rules and a
 * medallion — it should read as a declaration, not as a paragraph.
 */
export function MissionStatement({
  icon = "GuidingLamp",
  children,
  attribution,
}: {
  icon?: MissionIconName | string;
  children: ReactNode;
  attribution?: string;
}) {
  const Icon = resolveIcon(icon);

  return (
    <div className="relative mx-auto max-w-3xl rounded-card border border-ornate bg-surface px-6 py-12 text-center sm:px-12">
      <span className="mx-auto inline-flex size-16 items-center justify-center rounded-full border border-ornate bg-accent/12 text-primary">
        <Icon className="size-8" />
      </span>
      {/* A div, not a p. MDX wraps the sentence an author writes between the
          tags in a paragraph of its own, and a <p> inside a <p> is invalid
          HTML — the browser closes the outer one early, so the server markup
          and the client tree disagree and hydration fails.
          `.type-inherit-prose` makes that paragraph inherit this element's
          type instead of carrying its own. */}
      <div className="type-inherit-prose mt-6 type-display-lg leading-tight text-primary">
        {children}
      </div>
      {attribution && <p className="mt-4 type-overline">{attribution}</p>}
      <span
        aria-hidden
        className="mx-auto mt-8 block h-px w-24 bg-gradient-to-r from-transparent via-ornate to-transparent"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ numbers */

/**
 * A band of figures. Only use it for numbers that are true — an invented
 * "10,000 happy couples" is exactly the thing this rebuild is removing.
 *
 * Children-based, like every list block here: MDX does not reliably parse a
 * multi-line array in a JSX attribute once the element is nested inside
 * another JSX block, and every one of these blocks is nested inside <Section>.
 */
export function StatBand({ children }: { children: ReactNode }) {
  return <dl className="grid gap-6 sm:grid-cols-3">{children}</dl>;
}

export function StatItem({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon?: string;
}) {
  const Icon = icon ? resolveIcon(icon) : null;
  return (
    <div className="rounded-card border border-ornate/30 bg-surface px-5 py-6 text-center">
      {Icon && (
        <span className="mx-auto mb-3 inline-flex text-accent">
          <Icon className="size-6" />
        </span>
      )}
      <dt className="type-display-lg text-primary">{value}</dt>
      <dd className="mt-1 type-caption">{label}</dd>
    </div>
  );
}

/* ------------------------------------------------------------- alternating */

/**
 * Text beside an image, alternating side by side. `flip` puts the image first,
 * which is how you get an A/B rhythm down a page without a wrapper component
 * tracking the index.
 */
export function SplitFeature({
  icon,
  title,
  image,
  imageAlt,
  flip = false,
  children,
}: {
  icon?: string;
  title: string;
  image?: string;
  imageAlt?: string;
  flip?: boolean;
  children: ReactNode;
}) {
  const Icon = icon ? resolveIcon(icon) : null;

  return (
    <div className="my-14 grid items-center gap-8 md:grid-cols-2">
      <div className={flip ? "md:order-2" : ""}>
        {Icon && (
          <span className="inline-flex size-12 items-center justify-center rounded-full border border-ornate/60 bg-accent/10 text-primary">
            <Icon className="size-6" />
          </span>
        )}
        <h3 className="mt-4 type-h2 scroll-mt-28 text-primary">{title}</h3>
        <div className="mt-3 type-body-lg text-muted [&>p:first-child]:mt-0">{children}</div>
      </div>

      {image && (
        <figure className={flip ? "md:order-1" : ""}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={imageAlt ?? ""}
            loading="lazy"
            className="w-full rounded-card border border-ornate/30 object-cover"
          />
        </figure>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- timeline */

/** Milestones on a dashed thread — the same dhaga motif the themes use. */
export function Milestones({ children }: { children: ReactNode }) {
  return (
    <ol className="relative mx-auto max-w-2xl space-y-8 border-l-2 border-dashed border-ornate/50 pl-8">
      {children}
    </ol>
  );
}

export function Milestone({
  when,
  title,
  icon,
  children,
}: {
  when: string;
  title: string;
  icon?: string;
  children: ReactNode;
}) {
  const Icon = icon ? resolveIcon(icon) : null;
  return (
    <li className="relative">
      <span className="absolute -left-[2.6rem] inline-flex size-8 items-center justify-center rounded-full border border-ornate bg-surface text-primary">
        {Icon ? <Icon className="size-4" /> : <span className="size-2 rounded-full bg-accent" />}
      </span>
      <p className="type-overline text-accent">{when}</p>
      <h3 className="mt-1 type-h3 text-primary">{title}</h3>
      <div className="mt-1 type-body text-muted [&>p:first-child]:mt-0">{children}</div>
    </li>
  );
}

/* ------------------------------------------------------------- pull quote */

/** A founder line or a principle, set apart from the prose around it. */
export function PullQuote({
  children,
  attribution,
}: {
  children: ReactNode;
  attribution?: string;
}) {
  return (
    <figure className="my-14 text-center">
      <span aria-hidden className="type-display-lg leading-none text-accent/50">
        ❝
      </span>
      <blockquote className="mx-auto mt-2 max-w-2xl type-verse text-2xl leading-relaxed text-primary">
        {children}
      </blockquote>
      {attribution && <figcaption className="mt-4 type-overline">{attribution}</figcaption>}
    </figure>
  );
}

/* ---------------------------------------------------------------- promises */

/**
 * Commitments as a checklist. Deliberately a list, not cards — a promise reads
 * as more serious when it is written plainly.
 */
export function PromiseList({ children }: { children: ReactNode }) {
  return (
    <ul className="mx-auto max-w-2xl divide-y divide-ornate/25 rounded-card border border-ornate/35 bg-surface">
      {children}
    </ul>
  );
}

export function Promise({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4 px-6 py-5">
      <span
        aria-hidden
        className="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-ornate text-accent"
      >
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M4 12.5l5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div>
        <p className="type-body font-semibold text-foreground">{title}</p>
        <div className="mt-0.5 type-body text-muted [&>p:first-child]:mt-0">{children}</div>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------- steps */

/**
 * Numbered process, laid out horizontally on wide screens. The number is a CSS
 * counter, so steps can be reordered in the MDX without renumbering anything.
 */
export function ProcessSteps({ children }: { children: ReactNode }) {
  return (
    <ol className="grid gap-6 [counter-reset:process] sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </ol>
  );
}

export function ProcessStep({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: string;
  children: ReactNode;
}) {
  const Icon = icon ? resolveIcon(icon) : null;
  return (
    <li className="relative rounded-card border border-ornate/30 bg-surface p-6 [counter-increment:process]">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="type-display-lg leading-none text-accent/35 before:content-[counter(process)]"
        />
        {Icon && <Icon className="size-6 text-primary" />}
      </div>
      <h3 className="mt-3 type-h3 text-primary">{title}</h3>
      <div className="mt-1 type-body text-muted [&>p:first-child]:mt-0">{children}</div>
    </li>
  );
}

/* ----------------------------------------------------------------- closing */

/** Full-width closing call to action for a content page. */
export function ClosingCTA({
  title,
  body,
  primary = { href: "/signup", label: "Create your invitation" },
  secondary,
}: {
  title: string;
  body: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="my-16 -mx-4 rounded-card border border-ornate bg-accent/8 px-6 py-14 text-center sm:-mx-8 sm:px-12">
      <h2 className="type-h2 text-primary">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl type-body-lg text-muted">{body}</p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link href={primary.href}>
          <Button variant="celebration" size="lg">
            {primary.label}
          </Button>
        </Link>
        {secondary && (
          <Link href={secondary.href}>
            <Button variant="secondary" size="lg">
              {secondary.label}
            </Button>
          </Link>
        )}
      </div>
    </section>
  );
}

export const sectionComponents = {
  Section,
  IconCard,
  IconGrid,
  MissionStatement,
  StatBand,
  StatItem,
  SplitFeature,
  Milestones,
  Milestone,
  PullQuote,
  PromiseList,
  Promise,
  ProcessSteps,
  ProcessStep,
  ClosingCTA,
};
