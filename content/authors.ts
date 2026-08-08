/**
 * Author registry. Blog frontmatter references these by key, so an author's
 * bio and links live in one place instead of being copied into every post.
 * A post naming an unknown author fails the build — see lib/content/schema.ts.
 */

export interface Author {
  key: string;
  name: string;
  role: string;
  bio: string;
  /** Path under /public, or null while we have no headshot. */
  avatar: string | null;
  links?: { instagram?: string; linkedin?: string; x?: string; website?: string };
}

export const authors = {
  "prachi-jain": {
    key: "prachi-jain",
    name: "Prachi Jain",
    role: "Founder, Amantrika",
    bio: "Started Amantrika after finding a box of her mother's stored wedding cards and realising the invitation is the part of a wedding people keep.",
    avatar: null,
  },
  "amantrika-team": {
    key: "amantrika-team",
    name: "The Amantrika Team",
    role: "Amantrika",
    bio: "Notes on planning, invitations and the small logistics of a big Indian wedding.",
    avatar: null,
  },
} satisfies Record<string, Author>;

export type AuthorKey = keyof typeof authors;

export const authorKeys = Object.keys(authors) as AuthorKey[];

export function getAuthor(key: string): Author {
  const author = authors[key as AuthorKey];
  if (!author) {
    throw new Error(
      `Unknown author "${key}". Add them to content/authors.ts or fix the post's frontmatter.`
    );
  }
  return author;
}
