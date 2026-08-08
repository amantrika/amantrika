import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { AlertTriangle, ArrowRight, Info, Lightbulb, Sparkles } from "lucide-react";
import { Accordion } from "@/design-system/components/disclosure";
import { Button } from "@/design-system/components/Button";
import { themes } from "@/themes";
import { sectionComponents } from "./section-components";

/**
 * The authoring vocabulary. Everything a post can use beyond plain Markdown
 * lives here, so writers get a fixed, on-brand set of blocks instead of
 * inventing layout in every post.
 *
 * All of these render on the server. Only <FAQ> reaches for a client
 * component, because an accordion needs state.
 */

/* ------------------------------------------------------------ base elements */

/**
 * Base HTML styling. Deliberately written out rather than using a typography
 * plugin — the site's type scale lives in globals.css and these must match it.
 * Headings get no explicit id: rehype-slug adds ids matching the sidebar TOC.
 */
const baseComponents = {
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2
      {...props}
      className="type-h2 mt-14 scroll-mt-28 text-primary first:mt-0"
    />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 {...props} className="type-h3 mt-10 scroll-mt-28 text-foreground" />
  ),
  h4: (props: ComponentPropsWithoutRef<"h4">) => (
    <h4 {...props} className="mt-8 scroll-mt-28 font-semibold text-foreground" />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p {...props} className="type-body-lg mt-5 text-foreground/90" />
  ),
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul {...props} className="mt-5 list-disc space-y-2 pl-6 type-body-lg marker:text-accent" />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol {...props} className="mt-5 list-decimal space-y-2 pl-6 type-body-lg marker:text-accent" />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => <li {...props} className="pl-1" />,
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      {...props}
      className="mt-6 border-l-4 border-ornate/60 bg-accent/6 py-3 pl-5 pr-4 type-verse text-primary"
    />
  ),
  hr: () => <hr className="my-12 border-0 border-t border-ornate/30" />,
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong {...props} className="font-semibold text-foreground" />
  ),
  code: (props: ComponentPropsWithoutRef<"code">) => (
    <code
      {...props}
      className="rounded bg-foreground/8 px-1.5 py-0.5 font-mono text-[0.9em] text-primary"
    />
  ),
  pre: (props: ComponentPropsWithoutRef<"pre">) => (
    <pre
      {...props}
      className="mt-6 overflow-x-auto rounded-card border border-ornate/30 bg-foreground/5 p-4 text-sm [&_code]:bg-transparent [&_code]:p-0"
    />
  ),
  table: (props: ComponentPropsWithoutRef<"table">) => (
    // Wrapped so a wide table scrolls itself instead of the page.
    <div className="mt-6 overflow-x-auto rounded-card border border-ornate/40">
      <table {...props} className="w-full border-collapse text-left type-body" />
    </div>
  ),
  th: (props: ComponentPropsWithoutRef<"th">) => (
    <th
      {...props}
      className="border-b border-ornate/40 bg-accent/8 px-4 py-3 font-semibold text-primary"
    />
  ),
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td {...props} className="border-b border-ornate/20 px-4 py-3 align-top" />
  ),
  img: (props: ComponentPropsWithoutRef<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={props.alt ?? ""}
      loading="lazy"
      className="mt-6 w-full rounded-card border border-ornate/30"
    />
  ),
  a: ({ href = "", ...props }: ComponentPropsWithoutRef<"a">) => {
    const external = /^https?:\/\//.test(href);
    if (external) {
      return (
        <a
          {...props}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline decoration-accent/60 underline-offset-4 hover:decoration-accent"
        />
      );
    }
    return (
      <Link
        {...props}
        href={href}
        className="font-medium text-primary underline decoration-accent/60 underline-offset-4 hover:decoration-accent"
      />
    );
  },
};

/* ------------------------------------------------------- authoring blocks */

const calloutTones = {
  note: { icon: Info, ring: "border-primary/30 bg-primary/6", label: "Note" },
  tip: { icon: Lightbulb, ring: "border-success/40 bg-success/8", label: "Tip" },
  warning: { icon: AlertTriangle, ring: "border-error/40 bg-error/8", label: "Heads up" },
  tradition: { icon: Sparkles, ring: "border-ornate/50 bg-accent/8", label: "Tradition" },
} as const;

export function Callout({
  type = "note",
  title,
  children,
}: {
  type?: keyof typeof calloutTones;
  title?: string;
  children: ReactNode;
}) {
  const { icon: Icon, ring, label } = calloutTones[type];
  return (
    <aside className={`mt-8 flex gap-3 rounded-card border px-5 py-4 ${ring}`}>
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" />
      <div className="min-w-0">
        <p className="type-overline text-primary">{title ?? label}</p>
        <div className="mt-1 type-body [&>p:first-child]:mt-0">{children}</div>
      </div>
    </aside>
  );
}

export function Figure({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}) {
  return (
    <figure className="mt-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="w-full rounded-card border border-ornate/30" />
      {caption && <figcaption className="mt-2 type-caption text-center">{caption}</figcaption>}
    </figure>
  );
}

/** Numbered how-to steps. Renders as a real <ol> so it reads correctly unstyled. */
export function Steps({ children }: { children: ReactNode }) {
  return (
    <ol className="mt-8 space-y-5 border-l-2 border-dashed border-ornate/50 pl-6 [counter-reset:step]">
      {children}
    </ol>
  );
}

export function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="relative [counter-increment:step]">
      <span
        aria-hidden
        className="absolute -left-[2.15rem] flex size-6 items-center justify-center rounded-full border border-ornate bg-surface text-xs font-semibold text-primary before:content-[counter(step)]"
      />
      <p className="type-h3 text-foreground">{title}</p>
      <div className="mt-1 type-body [&>p:first-child]:mt-0">{children}</div>
    </li>
  );
}

/**
 * Question-and-answer block. The same items go into FAQPage JSON-LD via the
 * post's frontmatter, so the model reading the page and the crawler parsing it
 * see the same answers.
 */
export function FAQ({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section className="mt-10">
      <Accordion
        items={items.map((item, i) => ({
          id: `faq-${i}`,
          title: item.q,
          content: <p>{item.a}</p>,
        }))}
      />
    </section>
  );
}

/** Side-by-side comparison. A real table, so it is readable to crawlers and models. */
export function Comparison({
  columns,
  rows,
}: {
  columns: string[];
  rows: { label: string; values: (string | boolean)[] }[];
}) {
  const cell = (v: string | boolean) =>
    typeof v === "boolean" ? (
      <span className={v ? "text-success" : "text-muted"}>{v ? "Yes" : "No"}</span>
    ) : (
      v
    );

  return (
    <div className="mt-8 overflow-x-auto rounded-card border border-ornate/40">
      <table className="w-full border-collapse text-left type-body">
        <thead>
          <tr>
            <th className="border-b border-ornate/40 bg-accent/8 px-4 py-3" />
            {columns.map((c) => (
              <th
                key={c}
                className="border-b border-ornate/40 bg-accent/8 px-4 py-3 font-semibold text-primary"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="border-b border-ornate/20 px-4 py-3 font-medium">
                {row.label}
              </th>
              {row.values.map((v, i) => (
                <td key={i} className="border-b border-ornate/20 px-4 py-3">
                  {cell(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A theme swatch strip pulled from the real theme registry — never hand-copied hexes. */
export function ThemePreview({ id }: { id: string }) {
  const theme = themes.find((t) => t.id === id);
  if (!theme) {
    throw new Error(`<ThemePreview id="${id}"> — no such theme. See src/themes/index.ts.`);
  }
  return (
    <div className="mt-8 flex items-center gap-4 rounded-card border border-ornate/40 bg-surface p-4">
      <div aria-hidden className="flex overflow-hidden rounded-soft border border-ornate/40">
        {theme.palette.map((c) => (
          <span key={c} style={{ background: c }} className="size-10" />
        ))}
      </div>
      <div className="min-w-0">
        <p className="type-h3 text-primary">{theme.name}</p>
        <p className="type-caption capitalize">
          {theme.moodTag} · {theme.regionTag}
        </p>
      </div>
      <Link href="/signup" className="ml-auto shrink-0">
        <Button variant="secondary" size="sm">
          Use this theme
        </Button>
      </Link>
    </div>
  );
}

/**
 * The conversion block. Injected automatically after the second H2 and again
 * at the end of every post — a writer never has to remember it, and every post
 * therefore has at least one route to signup.
 */
export function CTA({
  title = "Make your own invitation",
  body = "Pick a theme, fill in your details, and share one link. It takes about fifteen minutes.",
  href = "/signup",
  label = "Start free",
}: {
  title?: string;
  body?: string;
  href?: string;
  label?: string;
}) {
  return (
    <aside className="my-12 rounded-card border border-ornate bg-accent/8 p-6 text-center sm:p-8">
      <p className="type-h2 text-primary">{title}</p>
      <p className="mx-auto mt-2 max-w-md type-body text-muted">{body}</p>
      <Link href={href} className="mt-5 inline-block">
        <Button variant="celebration" size="md">
          {label}
          <ArrowRight aria-hidden className="size-4" />
        </Button>
      </Link>
    </aside>
  );
}

/**
 * Everything an MDX file can reference: base HTML, the inline block
 * vocabulary, and the page-section blocks (Section, IconGrid, MissionStatement,
 * Milestones, …) that let a content page be composed of designed sections
 * rather than paragraphs.
 */
export const mdxComponents = {
  ...baseComponents,
  ...sectionComponents,
  Callout,
  Figure,
  Steps,
  Step,
  FAQ,
  Comparison,
  ThemePreview,
  CTA,
};
