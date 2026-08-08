import { describe, expect, it } from "vitest";
import {
  buildWatermarkPlan,
  createWatermarkPlan,
  selectorsFor,
  survivorsOf,
} from "@/lib/watermark";

/**
 * These are the two properties plan.md names as the exit criteria for the
 * watermark kit. They are the whole point of the module: if either fails, the
 * paid tier is a CSS snippet away from being free.
 */

describe("the watermark resists a written-once CSS rule", () => {
  it("uses no stable class across two requests", () => {
    const first = createWatermarkPlan();
    const second = createWatermarkPlan();

    expect(first.nonce).not.toBe(second.nonce);

    const firstClasses = new Set(first.marks.map((m) => m.className));
    const shared = second.marks.filter((m) => firstClasses.has(m.className));

    // A rule written against one render must match nothing in the next.
    expect(shared).toEqual([]);
  });

  it("gives every mark its own class within a single request", () => {
    const plan = buildWatermarkPlan("abc123");
    const classes = plan.marks.map((m) => m.className);

    expect(new Set(classes).size).toBe(classes.length);
  });
});

describe("the watermark survives deletion by any single selector", () => {
  it("leaves marks standing whichever one selector is removed", () => {
    const plan = buildWatermarkPlan("abc123");
    const selectors = selectorsFor(plan);

    expect(selectors.length).toBeGreaterThan(1);

    for (const selector of selectors) {
      const survivors = survivorsOf(plan, selector);
      expect(survivors.length, `"${selector}" removed every mark`).toBeGreaterThan(0);
    }
  });

  it("shares no attribute across all marks", () => {
    const plan = buildWatermarkPlan("abc123");

    // A common `data-watermark` would be a single selector that kills them all.
    const tags = new Set(plan.marks.map((m) => m.tag));
    expect(tags.size).toBeGreaterThan(1);
  });

  it("keeps one mark in the document flow, not in a fixed overlay", () => {
    const plan = buildWatermarkPlan("abc123");

    const inline = plan.marks.filter((m) => m.placement === "inline");
    expect(inline.length).toBeGreaterThan(0);

    // Removing every position:fixed element is the blunt attack. This survives.
    for (const mark of inline) {
      expect(mark.style.position).not.toBe("fixed");
    }
  });
});

describe("the watermark does not damage the invitation", () => {
  it("never swallows a tap meant for the RSVP button", () => {
    const plan = buildWatermarkPlan("abc123");

    for (const mark of plan.marks.filter((m) => m.placement === "overlay")) {
      expect(mark.style.pointerEvents).toBe("none");
    }
  });

  it("carries readable text rather than an empty decorative box", () => {
    const plan = buildWatermarkPlan("abc123");

    for (const mark of plan.marks) {
      expect(mark.text.length).toBeGreaterThan(0);
    }
  });

  it("produces valid CSS identifiers", () => {
    const plan = createWatermarkPlan();

    for (const mark of plan.marks) {
      expect(mark.className).toMatch(/^[a-z][a-z0-9_-]*$/i);
    }
  });
});
