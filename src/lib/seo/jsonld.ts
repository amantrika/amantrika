import { siteUrl } from "@/lib/env";
import type { Author } from "../../../content/authors";
import type { Post } from "@/lib/content/blog";

/**
 * Typed JSON-LD builders. Every structured-data object on the site comes from
 * here — never a hand-written template string in a component, because invalid
 * structured data is penalised harder than missing structured data.
 *
 * Validate any change against Google's Rich Results Test before shipping.
 */

export const BRAND = {
  name: "Amantrika",
  legalName: "Amantrika",
  tagline: "Digital invitations for Indian celebrations",
  description:
    "Amantrika turns an Indian wedding invitation into a single shareable link: a themed invitation website with RSVPs, directions, a countdown and a photo gallery.",
  email: "hello@amantrika.com",
  socials: [] as string[], // add real profiles only — never invent them
} as const;

/** Absolute URL for a site-relative path. Structured data must never be relative. */
export function absolute(path: string): string {
  return new URL(path, siteUrl).toString();
}

type Json = Record<string, unknown>;

const ORG_ID = `${siteUrl}/#organization`;
const SITE_ID = `${siteUrl}/#website`;

export function organizationJsonLd(): Json {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: BRAND.name,
    legalName: BRAND.legalName,
    url: siteUrl,
    description: BRAND.description,
    logo: { "@type": "ImageObject", url: absolute("/icon.png") },
    ...(BRAND.socials.length ? { sameAs: BRAND.socials } : {}),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: BRAND.email,
      areaServed: "IN",
      availableLanguage: ["en", "hi"],
    },
  };
}

export function websiteJsonLd(): Json {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    url: siteUrl,
    name: BRAND.name,
    description: BRAND.description,
    publisher: { "@id": ORG_ID },
    inLanguage: "en-IN",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/blog?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]): Json {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absolute(crumb.path),
    })),
  };
}

function personJsonLd(author: Author): Json {
  return {
    "@type": "Person",
    name: author.name,
    description: author.bio,
    jobTitle: author.role,
    url: absolute(`/about#${author.key}`),
  };
}

export function blogPostingJsonLd(post: Post): Json {
  const { frontmatter: fm } = post;
  const url = absolute(post.href);

  return {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: fm.title,
    description: fm.excerpt,
    url,
    datePublished: fm.publishedAt,
    dateModified: fm.updatedAt ?? fm.publishedAt,
    author: personJsonLd(post.author),
    publisher: { "@id": ORG_ID },
    inLanguage: "en-IN",
    articleSection: fm.category,
    keywords: fm.tags.join(", "),
    wordCount: post.body.split(/\s+/).filter(Boolean).length,
    timeRequired: `PT${post.readingTime}M`,
    ...(fm.coverImage
      ? { image: { "@type": "ImageObject", url: absolute(fm.coverImage), caption: fm.coverAlt } }
      : {}),
  };
}

export function blogJsonLd(posts: Post[]): Json {
  return {
    "@type": "Blog",
    "@id": `${siteUrl}/blog#blog`,
    url: absolute("/blog"),
    name: `${BRAND.name} Blog`,
    description:
      "Guides and inspiration for planning an Indian wedding and sending invitations people actually keep.",
    publisher: { "@id": ORG_ID },
    inLanguage: "en-IN",
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      "@id": `${absolute(p.href)}#article`,
      headline: p.frontmatter.title,
      url: absolute(p.href),
      datePublished: p.frontmatter.publishedAt,
      author: { "@type": "Person", name: p.author.name },
    })),
  };
}

export function faqJsonLd(items: { q: string; a: string }[]): Json {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function collectionPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
  items: { name: string; path: string }[];
}): Json {
  return {
    "@type": "CollectionPage",
    "@id": `${absolute(input.path)}#collection`,
    url: absolute(input.path),
    name: input.name,
    description: input.description,
    isPartOf: { "@id": SITE_ID },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: input.items.length,
      itemListElement: input.items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        url: absolute(item.path),
      })),
    },
  };
}

export function webPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
  updatedAt?: string;
}): Json {
  return {
    "@type": "WebPage",
    "@id": `${absolute(input.path)}#webpage`,
    url: absolute(input.path),
    name: input.name,
    description: input.description,
    isPartOf: { "@id": SITE_ID },
    ...(input.updatedAt ? { dateModified: input.updatedAt } : {}),
  };
}

/**
 * An invitation as a schema.org Event.
 *
 * Emitted **only** for a published, non-watermarked, non-hidden invitation
 * (CLAUDE.md §3). Announcing a free preview as a real event would put an
 * unpaid-for celebration into rich results, and would tell a crawler the
 * watermarked page is the finished article.
 */
export function eventJsonLd(input: {
  name: string;
  path: string;
  startDate: string;
  city?: string;
  description?: string;
  image?: string;
}): Json {
  return {
    "@type": "Event",
    "@id": `${absolute(input.path)}#event`,
    name: input.name,
    url: absolute(input.path),
    startDate: input.startDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: [input.image] } : {}),
    ...(input.city
      ? {
          location: {
            "@type": "Place",
            name: input.city,
            address: { "@type": "PostalAddress", addressLocality: input.city },
          },
        }
      : {}),
  };
}

/**
 * Wraps one or more nodes into a single @graph document. One script tag per
 * page keeps the entities cross-referenced by @id instead of duplicated.
 */
export function graph(...nodes: Json[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes });
}
