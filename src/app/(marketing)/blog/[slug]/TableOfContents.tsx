import type { TocEntry } from "@/lib/content/blog";

/**
 * On-page navigation for a post.
 *
 * Deliberately server-rendered with plain anchors and no scroll-spy: it costs
 * zero client JS, works before hydration, and every heading becomes a citable
 * fragment URL — which is what makes a section quotable by a model as well as
 * linkable by a reader.
 */
export function TableOfContents({ entries }: { entries: TocEntry[] }) {
  if (entries.length < 3) return null; // a two-item contents list is just noise

  return (
    <nav aria-labelledby="toc-heading" className="border-l border-ornate/40 pl-4">
      <p id="toc-heading" className="type-overline text-primary">
        On this page
      </p>
      <ol className="mt-3 space-y-2">
        {entries.map((entry) => (
          <li key={entry.id} className={entry.depth === 3 ? "pl-4" : ""}>
            <a
              href={`#${entry.id}`}
              className="type-caption leading-snug text-muted transition-colors hover:text-primary"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
