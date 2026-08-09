import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { themes } from "../../src/themes";

/**
 * The gallery is display; `render_theme_id` is what gets built. That indirection
 * is only safe while every card points at a theme that exists — a card pointing
 * at nothing is a couple choosing a design and hitting a foreign-key error at
 * save time, or worse, a published invitation with no renderer.
 *
 * Postgres enforces the reference at runtime. This asserts it at test time,
 * where a mistake costs a red CI run instead of a checkout, and reads the seed
 * out of the migration for the same reason `theme-catalogue.test.ts` does:
 * there is no database in CI.
 */

const MIGRATION = join(__dirname, "../../supabase/migrations/20260809093641_atheme_gallery.sql");

function seededCards(): { id: string; renderThemeId: string; imagePath: string }[] {
  const sql = readFileSync(MIGRATION, "utf8");
  // Each seeded row:  ('timeless-charm', 'Timeless Charm', '/image/upload/…', 'ivory-minimal', 10),
  const rows = [
    ...sql.matchAll(/\(\s*'([a-z0-9-]+)',\s*'[^']*',\s*'([^']*)',\s*'([a-z0-9-]+)',\s*\d+\s*\)/g),
  ];
  return rows.map((m) => ({ id: m[1], imagePath: m[2], renderThemeId: m[3] }));
}

describe("the theme gallery", () => {
  const cards = seededCards();

  it("seeds the five designs from themes.csv", () => {
    expect(cards.map((c) => c.id).sort()).toEqual([
      "classic-elegance",
      "eternal-grace",
      "indian-touch",
      "modern-chic",
      "timeless-charm",
    ]);
  });

  it("points every card at a theme the registry can draw", () => {
    const registryIds = new Set(themes.map((t) => t.id));
    const dangling = cards.filter((c) => !registryIds.has(c.renderThemeId));
    expect(
      dangling.map((c) => `${c.id} -> ${c.renderThemeId}`),
      "gallery cards whose render theme does not exist"
    ).toEqual([]);
  });

  it("stores image paths without a host, so the cloud name stays configuration", () => {
    // A full URL in a row is an account migration that needs an UPDATE. See the
    // comment on the migration, and `cloudinaryUrl()`.
    const absolute = cards.filter((c) => !c.imagePath.startsWith("/image/upload/"));
    expect(absolute.map((c) => c.id), "image_path should be a Cloudinary delivery path").toEqual([]);
  });
});
