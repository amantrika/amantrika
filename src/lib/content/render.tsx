import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { mdxComponents } from "./mdx-components";

/**
 * MDX rendering. Compiles on the server — no client-side MDX runtime ships, and
 * the full prose is present in the initial HTML for crawlers and for the
 * fetchers LLMs use.
 *
 * rehype-slug puts ids on headings using the same slugger the table of contents
 * uses, so sidebar anchors always resolve.
 *
 * Evaluated with `@mdx-js/mdx` directly rather than through
 * `next-mdx-remote/rsc`. That package bundles its own jsx-runtime shim written
 * for React 17/18; under React 19 it evaluated the compiled module with a
 * runtime that dropped element props, so any component taking attributes —
 * `<Comparison columns={…} rows={…} />` — was invoked with `{}` and crashed on
 * the first `.map`. The compiled output was always correct; only the evaluation
 * step was wrong, which made it look like an authoring bug in the MDX.
 */
export async function MdxBody({ source }: { source: string }) {
  const { default: Content } = await evaluate(source, {
    ...runtime,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug],
    // Frontmatter is already parsed and validated by the loader.
  });

  return <Content components={mdxComponents} />;
}

/**
 * Splits a post body just before its third H2, which is where the mid-article
 * CTA goes — "after the second section" reads naturally and lands past the
 * point where a reader has committed.
 *
 * Posts with fewer than three H2s get no mid-article CTA; the closing one is
 * enough, and interrupting a short post is worse than not converting it.
 */
export function splitAtSecondSection(body: string): [string, string | null] {
  const withoutCode = body.replace(/```[\s\S]*?```/g, (m) => " ".repeat(m.length));
  const positions: number[] = [];
  const heading = /^##\s+\S/gm;

  let match: RegExpExecArray | null;
  while ((match = heading.exec(withoutCode)) !== null) {
    positions.push(match.index);
    if (positions.length === 3) break;
  }

  if (positions.length < 3) return [body, null];
  return [body.slice(0, positions[2]), body.slice(positions[2])];
}
