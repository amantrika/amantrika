import { describe, expect, it } from "vitest";
import matter from "gray-matter";
import { pageFrontmatterSchema, postFrontmatterSchema } from "@/lib/content/schema";

/**
 * Dates in frontmatter, both ways they can legitimately be written.
 *
 * YAML has a native date type. `updatedAt: 2026-08-08` is parsed into a `Date`;
 * `updatedAt: "2026-08-08"` stays a string. Both are valid, both occur in
 * `content/`, and Keystatic's date field writes the unquoted one — which took
 * /about, /contact, /how-it-works, /roadmap and /changelog down with "Invalid
 * input" the first time a page was saved through the editor.
 *
 * The parse goes through gray-matter rather than handing Zod a literal, because
 * the bug lived in the gap between the YAML parser and the schema. A test that
 * passed Zod a string would have gone green while every page was broken.
 */

const pageBody = (updatedAt: string) => `---
title: A page
description: A description long enough to satisfy the forty character minimum here.
updatedAt: ${updatedAt}
---

Body.
`;

const postBody = (publishedAt: string) => `---
title: A post
excerpt: An excerpt long enough to satisfy the forty character minimum imposed here.
publishedAt: ${publishedAt}
author: amantrika-team
category: "Product"
tags: ["Test"]
---

Body.
`;

describe("frontmatter dates", () => {
  it("accepts an unquoted YAML date, which arrives as a Date object", () => {
    const { data } = matter(pageBody("2026-08-08"));
    expect(data.updatedAt, "gray-matter should hand us a Date here").toBeInstanceOf(Date);

    const parsed = pageFrontmatterSchema.safeParse(data);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.updatedAt).toBe("2026-08-08");
  });

  it("accepts a quoted date, which arrives as a string", () => {
    const { data } = matter(pageBody('"2026-08-08"'));
    expect(typeof data.updatedAt).toBe("string");

    const parsed = pageFrontmatterSchema.safeParse(data);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.updatedAt).toBe("2026-08-08");
  });

  it("normalises without shifting the day", () => {
    // A Date built from a bare YAML date is midnight UTC. Formatting it through
    // a local timezone would move it a day backwards west of Greenwich.
    for (const day of ["2026-01-01", "2026-06-30", "2026-12-31"]) {
      const { data } = matter(pageBody(day));
      const parsed = pageFrontmatterSchema.safeParse(data);
      expect(parsed.success && parsed.data.updatedAt, `${day} should survive intact`).toBe(day);
    }
  });

  it("applies to posts too", () => {
    const { data } = matter(postBody("2026-08-08"));
    const parsed = postFrontmatterSchema.safeParse(data);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.publishedAt).toBe("2026-08-08");
  });

  it("still rejects something that is not a date", () => {
    const { data } = matter(pageBody('"last Tuesday"'));
    expect(pageFrontmatterSchema.safeParse(data).success).toBe(false);
  });
});
