import { graph } from "./jsonld";

/**
 * Renders a schema.org @graph into the server-rendered HTML.
 *
 * Server component on purpose: structured data injected after hydration is
 * routinely missed by crawlers and by the fetchers LLMs use.
 */
export function JsonLd({ nodes }: { nodes: Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // Content is built by our own typed builders from validated frontmatter,
      // and JSON.stringify escapes the payload.
      dangerouslySetInnerHTML={{ __html: graph(...nodes) }}
    />
  );
}
