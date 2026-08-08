import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Path-based pagination: /blog, /blog/page/2, /blog/page/3 …
 *
 * Paths, not query strings, because each page is a distinct crawlable URL with
 * its own canonical. `basePath` is the listing root ("/blog",
 * "/blog/category/guides"); page 1 always lives at the root itself, never at
 * ".../page/1", so there is exactly one URL per page of results.
 */

export function pageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}/page/${page}`;
}

/** Windowed page numbers with ellipses: 1 … 4 5 6 … 12 */
function pageWindow(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const out: (number | "gap")[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) out.push("gap");
    out.push(page);
    previous = page;
  }
  return out;
}

export function Pagination({
  basePath,
  page,
  totalPages,
}: {
  basePath: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const linkCls =
    "inline-flex size-10 items-center justify-center rounded-soft border border-ornate/40 type-body transition-colors hover:bg-accent/10";

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={pageHref(basePath, page - 1)} rel="prev" aria-label="Previous page" className={linkCls}>
          <ChevronLeft aria-hidden className="size-4" />
        </Link>
      ) : (
        <span aria-hidden className={`${linkCls} opacity-40`}>
          <ChevronLeft className="size-4" />
        </span>
      )}

      {pageWindow(page, totalPages).map((entry, i) =>
        entry === "gap" ? (
          <span key={`gap-${i}`} className="px-1 type-caption" aria-hidden>
            …
          </span>
        ) : entry === page ? (
          <span
            key={entry}
            aria-current="page"
            className={`${linkCls} border-primary bg-primary font-semibold text-bg`}
          >
            {entry}
          </span>
        ) : (
          <Link key={entry} href={pageHref(basePath, entry)} className={linkCls}>
            {entry}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link href={pageHref(basePath, page + 1)} rel="next" aria-label="Next page" className={linkCls}>
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      ) : (
        <span aria-hidden className={`${linkCls} opacity-40`}>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
