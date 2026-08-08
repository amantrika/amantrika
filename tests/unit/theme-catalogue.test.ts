import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { themes } from "../../src/themes";

/**
 * The themes table and the theme registry describe the same twelve things from
 * two sides: the table decides what is *offered*, the registry decides how it
 * is *drawn*. Neither can validate the other at runtime, so this does it at
 * test time.
 *
 * Both failure directions are real and neither is loud on its own:
 *
 *   catalogue row without a registry entry → a host picks a theme, the guest
 *     page cannot render it, and the failure lands on the invitation rather
 *     than on the person who added the row.
 *   registry entry without a catalogue row → a theme that exists, works, and
 *     can never be chosen. Invisible until someone asks where it went.
 *
 * The seed is read out of the migration rather than the database because this
 * must fail in CI, where there is no database. It is a parse of the `insert`
 * statement, which is coarse — if the migration is ever rewritten to seed some
 * other way, this test should be rewritten with it rather than deleted.
 */

const MIGRATION = join(
  __dirname,
  "../../supabase/migrations/20260808220359_themes_catalogue.sql"
);

function seededThemes(): { id: string; tier: string }[] {
  const sql = readFileSync(MIGRATION, "utf8");
  // Each seeded row looks like:  ('royal-maroon', 'Royal Maroon', 'free', …
  const rows = [...sql.matchAll(/\(\s*'([a-z0-9-]+)',\s*'[^']*',\s*'(free|premium)'/g)];
  return rows.map((m) => ({ id: m[1], tier: m[2] }));
}

describe("the theme catalogue and the theme registry", () => {
  const seeded = seededThemes();

  it("seeds every theme the registry can draw", () => {
    const seededIds = new Set(seeded.map((t) => t.id));
    const missing = themes.map((t) => t.id).filter((id) => !seededIds.has(id));
    expect(missing, "in src/themes but never seeded — cannot be chosen").toEqual([]);
  });

  it("seeds nothing the registry cannot draw", () => {
    const registryIds = new Set(themes.map((t) => t.id));
    const unknown = seeded.map((t) => t.id).filter((id) => !registryIds.has(id));
    expect(unknown, "seeded but absent from src/themes — would fail to render").toEqual([]);
  });

  it("keeps at least one free theme for every religion the registry serves", () => {
    // A family should never be pushed to pay because of their religion. If a
    // faith's only themes are premium, the free tier excludes them outright.
    const tierById = new Map(seeded.map((t) => [t.id, t.tier]));
    const freeReligions = new Set(
      themes.filter((t) => tierById.get(t.id) === "free").map((t) => t.religionTag)
    );
    const allReligions = [...new Set(themes.map((t) => t.religionTag))];

    const unserved = allReligions.filter((r) => !freeReligions.has(r));
    expect(unserved, "religions with no free theme").toEqual([]);
  });

  it("keeps the default theme free", () => {
    // `events.theme_id` defaults to this. A premium default would put every new
    // free invitation on a theme its plan may not choose.
    expect(seeded.find((t) => t.id === "royal-maroon")?.tier).toBe("free");
  });
});
