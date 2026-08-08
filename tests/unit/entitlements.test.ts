import { describe, expect, it } from "vitest";
import { entitlementsFor, isWatermarked } from "@/lib/invites/entitlements";

describe("entitlementsFor", () => {
  it("watermarks the free plan", () => {
    const free = entitlementsFor("free");

    expect(free.watermarked).toBe(true);
    expect(free.ogImage).toBe(false);
    expect(free.structuredData).toBe(false);
  });

  it("lifts the watermark on every paid plan", () => {
    for (const code of ["classic", "premium"]) {
      const paid = entitlementsFor(code);

      expect(paid.watermarked, `${code} should not be watermarked`).toBe(false);
      expect(paid.ogImage).toBe(true);
      expect(paid.structuredData).toBe(true);
    }
  });

  it("fails closed on an unknown plan", () => {
    // A typo or a half-applied migration must cost a watermark, not revenue.
    for (const value of ["enterprise", "", "FREE", "classic ", null, undefined]) {
      expect(isWatermarked(value as string), `"${value}" should fail closed`).toBe(true);
    }
  });

  it("reports the resolved plan, not the requested one", () => {
    expect(entitlementsFor("nonsense").planCode).toBe("free");
    expect(entitlementsFor("premium").planCode).toBe("premium");
  });

  it("keeps behaviour agreeing with the plans table copy", () => {
    // `plans.features` advertises these; the resolver must not drift from them.
    expect(entitlementsFor("classic").maxSubEvents).toBe(6);
    expect(entitlementsFor("classic").customDomain).toBe(false);
    expect(entitlementsFor("premium").maxSubEvents).toBeNull();
    expect(entitlementsFor("premium").customDomain).toBe(true);
    expect(entitlementsFor("free").blessingWall).toBe(false);
  });
});
