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

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Not a real date");

/** Post categories. Adding one here is what makes /blog/category/<slug> exist. */
export const categories = [
  "Guides",
  "Inspiration",
  "Traditions",
  "Planning",
  "Product",
] as const;

export type Category = (typeof categories)[number];

export const faqItemSchema = z.object({
  q: z.string().min(1),
  a: z.string().min(1),
});

export const postFrontmatterSchema = z
  .object({
    title: z.string().min(1).max(90),
    /** Must equal the filename. Enforced by the loader, not here. */
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase words separated by hyphens"),
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

export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>;

/** Standalone marketing/legal pages written as MDX. */
export const pageFrontmatterSchema = z.object({
  title: z.string().min(1).max(90),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().min(40).max(180),
  updatedAt: isoDate,
  /** Legal pages get a narrower column and a "last updated" line. */
  layout: z.enum(["prose", "legal"]).default("prose"),
  /** Kept out of the sitemap when false. */
  indexable: z.boolean().default(true),
  faq: z.array(faqItemSchema).optional(),
});

export type PageFrontmatter = z.infer<typeof pageFrontmatterSchema>;
