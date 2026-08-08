import { z } from "zod";
import { authorKeys } from "../../../content/authors";

/**
 * Frontmatter contracts for everything in content/.
 *
 * These are validated at read time, and every content route reads at build
 * time — so a malformed post fails the build rather than shipping a page with
 * broken structured data. That is the whole point: JSON-LD is generated from
 * these fields, and Google punishes invalid structured data harder than it
 * rewards valid data.
 */

/**
 * A YYYY-MM-DD date in frontmatter.
 *
 * The `preprocess` is not defensive padding — it is required. YAML has a native
 * date type, so an unquoted `updatedAt: 2026-08-08` is parsed into a `Date`
 * before Zod ever sees it, while a quoted `"2026-08-08"` stays a string. Both
 * spellings are valid YAML and both are written by hand in this repo, and
 * Keystatic's date field emits the unquoted form — which took five content
 * pages down with "Invalid input" the first time a page was saved through the
 * editor.
 *
 * Normalised in UTC deliberately. `toISOString()` on a Date built from a bare
 * YAML date is midnight UTC, so slicing the first ten characters returns the
 * day that was written. Going through the local timezone instead would shift
 * the date by one for anyone west of Greenwich.
 */
const isoDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .refine((s) => !Number.isNaN(Date.parse(s)), "Not a real date")
);

/** Post categories. Adding one here is what makes /blog/category/<slug> exist. */
export const categories = [
  "Guides",
  "Inspiration",
  "Traditions",
  "Planning",
  "Product",
] as const;

export type Category = (typeof categories)[number];

/**
 * Page layouts. Exported as an array rather than inlined into the enum because
 * `keystatic.config.ts` builds its layout dropdown from this — the editor and
 * the validator have to offer the same set, and a comment asking two files to
 * agree is not a mechanism. Adding one here is what makes it selectable.
 */
export const pageLayouts = ["prose", "legal", "wide"] as const;

export type PageLayout = (typeof pageLayouts)[number];

export const faqItemSchema = z.object({
  q: z.string().min(1),
  a: z.string().min(1),
});

export const postFrontmatterSchema = z
  .object({
    title: z.string().min(1).max(90),
    /**
     * Optional, because the filename is what the URL is actually built from and
     * the loader fills this in from it. Write it and it must match — a
     * disagreement is an error, not a silent preference. Keystatic encodes the
     * slug in the filename and writes no `slug` key, which is why declaring it
     * cannot be mandatory.
     */
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase words separated by hyphens")
      .optional(),
    /** Doubles as the meta description, so it is length-capped. */
    excerpt: z.string().min(40).max(180),
    publishedAt: isoDate,
    updatedAt: isoDate.optional(),
    author: z.enum(authorKeys as [string, ...string[]]),
    category: z.enum(categories),
    tags: z.array(z.string().min(1)).min(1).max(8),
    coverImage: z.string().startsWith("/").optional(),
    /** Required whenever there is a cover — an empty alt is an a11y and SEO failure. */
    coverAlt: z.string().min(1).optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    /** Optional; drives FAQPage JSON-LD and a rendered accordion. */
    faq: z.array(faqItemSchema).optional(),
    /** Overrides the <title> tag when the on-page H1 is not the best search title. */
    seoTitle: z.string().max(70).optional(),
  })
  .refine((d) => !d.coverImage || Boolean(d.coverAlt), {
    message: "coverImage requires coverAlt",
    path: ["coverAlt"],
  });

/**
 * What a post's frontmatter is *after* the loader has resolved it. `slug` is
 * optional to declare and always present to read, so nothing downstream has to
 * think about where it came from.
 */
export type PostFrontmatter = Omit<z.infer<typeof postFrontmatterSchema>, "slug"> & {
  slug: string;
};

/** Standalone marketing/legal pages written as MDX. */
export const pageFrontmatterSchema = z.object({
  title: z.string().min(1).max(90),
  /** Optional and filename-derived, exactly as for a post. */
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().min(40).max(180),
  updatedAt: isoDate,
  /**
   * How the page is laid out.
   *   prose  — reading column with a sticky table of contents beside it
   *   legal  — the same column, no contents, "in effect from" instead
   *   wide   — full content width, no sidebar. For pages built out of designed
   *            <Section> bands rather than continuous prose (about,
   *            how-it-works): those want the whole page, and a contents rail
   *            beside a page of banded sections is navigation for a document
   *            that is already skimmable.
   */
  layout: z.enum(pageLayouts).default("prose"),
  /** Kept out of the sitemap when false. */
  indexable: z.boolean().default(true),
  faq: z.array(faqItemSchema).optional(),
});

export type PageFrontmatter = Omit<z.infer<typeof pageFrontmatterSchema>, "slug"> & {
  slug: string;
};
