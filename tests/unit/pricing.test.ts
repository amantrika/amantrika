import { afterEach, describe, expect, it } from "vitest";
import { computePrice, daysUntil, formatInr, toMinorUnits } from "@/lib/pricing";

const CLASSIC = { code: "classic", name: "Classic", price_inr: 2999 };
const FREE = { code: "free", name: "Sneak Peek", price_inr: 0 };

const NOW = new Date("2026-01-01T00:00:00Z");
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

afterEach(() => {
  delete process.env.PRICING_EARLY_BIRD;
});

describe("computePrice", () => {
  it("charges list price when the discount ladder is off", () => {
    const price = computePrice({ plan: CLASSIC, eventDate: daysFromNow(400), now: NOW });

    expect(price.final_price_inr).toBe(2999);
    expect(price.discount_inr).toBe(0);
    expect(price.discount_reason).toBeNull();
  });

  it("leaves a free plan at zero", () => {
    const price = computePrice({ plan: FREE, eventDate: daysFromNow(400), now: NOW });
    expect(price.final_price_inr).toBe(0);
  });

  describe("with the early-bird ladder enabled", () => {
    // Each case is the *inclusive lower bound* of its tier, per §14.
    const cases: Array<[days: number, expected: number, label: string]> = [
      [400, 1799, "40% at 270+ days"],
      [270, 1799, "40% at exactly 270 days"],
      [269, 2249, "25% at 269 days"],
      [180, 2249, "25% at exactly 180 days"],
      [179, 2699, "10% at 179 days"],
      [90, 2699, "10% at exactly 90 days"],
      [89, 2999, "full price at 89 days"],
      [0, 2999, "full price on the day"],
    ];

    for (const [days, expected, label] of cases) {
      it(label, () => {
        process.env.PRICING_EARLY_BIRD = "true";
        const price = computePrice({
          plan: CLASSIC,
          eventDate: daysFromNow(days),
          now: NOW,
        });
        expect(price.final_price_inr).toBe(expected);
      });
    }

    it("never discounts a free plan", () => {
      process.env.PRICING_EARLY_BIRD = "true";
      const price = computePrice({ plan: FREE, eventDate: daysFromNow(400), now: NOW });
      expect(price.final_price_inr).toBe(0);
      expect(price.discount_reason).toBeNull();
    });

    it("charges full price when no event date is known", () => {
      process.env.PRICING_EARLY_BIRD = "true";
      const price = computePrice({ plan: CLASSIC, eventDate: null, now: NOW });
      expect(price.final_price_inr).toBe(2999);
    });

    it("phrases the saving as a gain, never as a penalty", () => {
      process.env.PRICING_EARLY_BIRD = "true";
      const price = computePrice({ plan: CLASSIC, eventDate: daysFromNow(400), now: NOW });

      expect(price.discount_reason).toContain("you saved");
      expect(price.discount_reason).not.toMatch(/late|penalty|surcharge|too close/i);
    });

    it("keeps the breakdown reconciling to the final price", () => {
      process.env.PRICING_EARLY_BIRD = "true";
      const price = computePrice({ plan: CLASSIC, eventDate: daysFromNow(400), now: NOW });

      const sum = price.breakdown.reduce((total, line) => total + line.amount_inr, 0);
      expect(sum).toBe(price.final_price_inr);
    });

    it("ignores an event date already in the past", () => {
      process.env.PRICING_EARLY_BIRD = "true";
      const price = computePrice({ plan: CLASSIC, eventDate: daysFromNow(-30), now: NOW });
      expect(price.final_price_inr).toBe(2999);
    });
  });
});

describe("daysUntil", () => {
  it("floors partial days", () => {
    expect(daysUntil(new Date(NOW.getTime() + 86_400_000 * 1.9), NOW)).toBe(1);
  });

  it("goes negative once the date has passed", () => {
    expect(daysUntil(daysFromNow(-3), NOW)).toBe(-3);
  });
});

describe("toMinorUnits", () => {
  it("converts rupees to paise", () => {
    expect(toMinorUnits(2999)).toBe(299900);
    expect(toMinorUnits(0)).toBe(0);
  });

  it("never emits a fractional paisa", () => {
    expect(Number.isInteger(toMinorUnits(1499.5))).toBe(true);
  });
});

describe("formatInr", () => {
  it("says Free rather than ₹0", () => {
    expect(formatInr(0)).toBe("Free");
  });

  it("groups digits the Indian way", () => {
    expect(formatInr(299900)).toBe("₹2,99,900");
  });
});
