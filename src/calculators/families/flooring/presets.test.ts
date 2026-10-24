import { describe, expect, it } from "vitest";
import { calculators } from "./index";

describe("flooring calculator entries", () => {
  it("registers flooring, carpet and baseboard", () => {
    expect(calculators.map((c) => c.meta.slug)).toEqual(["flooring-calculator", "carpet-calculator", "baseboard-calculator"]);
  });

  for (const c of calculators) {
    describe(c.meta.slug, () => {
      it("meta fits search limits", () => {
        expect(c.meta.metaTitle.length).toBeLessThanOrEqual(60);
        expect(c.meta.metaDescription.length).toBeLessThanOrEqual(158);
        expect(c.meta.faq.length).toBeGreaterThanOrEqual(5);
        expect(c.meta.faq.length).toBeLessThanOrEqual(8);
      });

      it("presets have unique slugs, titles within limits and distinct answers", () => {
        const presets = c.presets ?? [];
        expect(new Set(presets.map((p) => p.slug)).size).toBe(presets.length);
        expect(new Set(presets.map((p) => p.h1)).size).toBe(presets.length);
        const headlines = new Set<string>();
        for (const p of presets) {
          expect(p.slug).toMatch(/^[a-z0-9-]+$/);
          expect(p.metaTitle.length, p.slug).toBeLessThanOrEqual(60);
          expect(p.metaDescription.length, p.slug).toBeLessThanOrEqual(158);
          expect(p.metaDescription, p.slug).toMatch(/\d/);
          const a = c.presetAnswer!(p.values);
          expect(a.bullets.length, p.slug).toBeGreaterThanOrEqual(3);
          expect(a.table?.rows.length, p.slug).toBeGreaterThan(1);
          expect(a.headline).not.toMatch(/NaN|undefined|Infinity/);
          headlines.add(a.headline);
        }
        expect(headlines.size).toBe(presets.length);
      });
    });
  }
});
