import { config, collection, fields } from "@keystatic/core";
import { authors } from "./content/authors";
import { categories } from "./src/lib/content/schema";

/**
 * Keystatic — an editing UI for the MDX that is already in this repo.
 *
 * It is deliberately **not** a CMS in the usual sense. There is no database and
 * no content API: the admin at `/keystatic` reads and writes the same files in
 * `content/` that you would otherwise open in an editor, and saving is a file
 * write you then commit like any other change. Everything downstream is
 * untouched — Zod still validates frontmatter at read time, a malformed post
 * still fails the build, and the markdown twins, RSS, sitemap and JSON-LD still
 * derive from the filesystem. That is the point: `project-overview.md` §2.10
 * chose MDX-in-the-repo over a database CMS, and this adds the missing editing
 * surface without reversing that decision.
 *
 * **The fields below must mirror `src/lib/content/schema.ts`.** Keystatic
 * validates as you type; Zod validates at build. If they disagree, the UI will
 * happily save a post that then breaks the build, which is the worst of both.
 * `categories` and `authors` are imported rather than retyped so two of the
 * three cannot drift at all.
 *
 * Storage is `local`, so this only works against a checkout on your machine.
 * The route is gated to local hosts for the same reason it would be gated
 * anyway: on a deployment there is no writable repo to save into, and an admin
 * UI on a public origin is a surface nobody asked for.
 */

const authorOptions = Object.values(authors).map((a) => ({
  label: a.name,
  value: a.key,
}));

/** Shared by posts and pages — both render an FAQ and both emit FAQPage JSON-LD. */
const faqField = fields.array(
  fields.object({
    q: fields.text({ label: "Question", validation: { length: { min: 1 } } }),
    a: fields.text({ label: "Answer", multiline: true, validation: { length: { min: 1 } } }),
  }),
  {
    label: "FAQ",
    description:
      "Rendered as an accordion and emitted as FAQPage structured data. Ask the question the way a reader would type it.",
    itemLabel: (props) => props.fields.q.value || "Question",
  }
);

export default config({
  storage: { kind: "local" },

  ui: {
    brand: { name: "Amantrika" },
  },

  collections: {
    posts: collection({
      label: "Blog posts",
      path: "content/blog/*",
      format: { contentField: "content", data: "yaml" },
      // The filename is the URL and the loader treats it as authoritative, so
      // no `slug` is written into frontmatter. Renaming a published post here
      // changes its URL — the same hazard as renaming the file by hand.
      slugField: "title",
      entryLayout: "content",
      columns: ["title", "publishedAt"],
      schema: {
        title: fields.slug({
          name: {
            label: "Title",
            description: "Shown as the H1. Kept under 90 characters.",
            validation: { length: { min: 1, max: 90 } },
          },
          slug: {
            label: "Slug",
            description:
              "Becomes the filename and the URL. Change it on a published post and every existing link breaks.",
            validation: { length: { min: 1 } },
          },
        }),
        excerpt: fields.text({
          label: "Excerpt",
          description:
            "Doubles as the meta description, so it is length-capped. 40–180 characters.",
          multiline: true,
          validation: { length: { min: 40, max: 180 } },
        }),
        publishedAt: fields.date({
          label: "Published",
          validation: { isRequired: true },
        }),
        updatedAt: fields.date({
          label: "Updated",
          description: "Leave empty until the post is substantively revised.",
        }),
        author: fields.select({
          label: "Author",
          options: authorOptions,
          defaultValue: authorOptions[0]?.value ?? "amantrika-team",
        }),
        category: fields.select({
          label: "Category",
          description: "Adding a category is a code change — see src/lib/content/schema.ts.",
          options: categories.map((c) => ({ label: c, value: c })),
          defaultValue: categories[0],
        }),
        tags: fields.array(fields.text({ label: "Tag" }), {
          label: "Tags",
          description: "Between one and eight.",
          itemLabel: (props) => props.value,
          validation: { length: { min: 1, max: 8 } },
        }),
        coverImage: fields.text({
          label: "Cover image",
          description: "A path under /public, e.g. /assets/blog/name.png.",
        }),
        coverAlt: fields.text({
          label: "Cover alt text",
          description:
            "Required whenever there is a cover. An empty alt is both an accessibility failure and an SEO one.",
        }),
        featured: fields.checkbox({ label: "Featured", defaultValue: false }),
        draft: fields.checkbox({
          label: "Draft",
          description: "Drafts render locally and are excluded from production builds.",
          defaultValue: false,
        }),
        seoTitle: fields.text({
          label: "SEO title",
          description:
            "Overrides the <title> tag when the on-page H1 is not the best search title. Max 70 characters.",
          validation: { length: { max: 70 } },
        }),
        faq: faqField,
        content: fields.mdx({
          label: "Body",
          description:
            "The block components (Callout, Steps, FAQ, Comparison, ThemePreview, CTA, Figure) are written as JSX and pass through untouched.",
        }),
      },
    }),

    pages: collection({
      label: "Pages",
      path: "content/pages/*",
      format: { contentField: "content", data: "yaml" },
      slugField: "title",
      entryLayout: "content",
      columns: ["title", "updatedAt"],
      schema: {
        title: fields.slug({
          name: { label: "Title", validation: { length: { min: 1, max: 90 } } },
          slug: {
            label: "Slug",
            description: "Becomes the filename and the URL, e.g. `about` → /about.",
          },
        }),
        description: fields.text({
          label: "Description",
          description: "The meta description. 40–180 characters.",
          multiline: true,
          validation: { length: { min: 40, max: 180 } },
        }),
        updatedAt: fields.date({ label: "Updated", validation: { isRequired: true } }),
        layout: fields.select({
          label: "Layout",
          description: "Legal pages get a narrower column and a 'last updated' line.",
          options: [
            { label: "Prose", value: "prose" },
            { label: "Legal", value: "legal" },
          ],
          defaultValue: "prose",
        }),
        indexable: fields.checkbox({
          label: "Indexable",
          description: "Unchecked keeps the page out of the sitemap.",
          defaultValue: true,
        }),
        faq: faqField,
        content: fields.mdx({ label: "Body" }),
      },
    }),
  },
});
