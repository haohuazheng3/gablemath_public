import { describe, expect, it } from "vitest";
import { calculators } from "./index";

describe("roofing calculator entries", () => {
  it("meta stays within search-snippet limits", () => {
    for (const c of calculators) {
      expect(c.meta.metaTitle.length, c.meta.metaTitle).toBeLessThanOrEqual(60);
      expect(c.meta.metaDescription.length, c.meta.metaDescription).toBeLessThanOrEqual(158);
      expect(c.meta.faq.length).toBeGreaterThanOrEqual(5);
      expect(c.meta.faq.length).toBeLessThanOrEqual(8);
    }
  });

  it("presets have unique slugs, valid meta and distinct answers", () => {
    for (const c of calculators) {
      const presets = c.presets ?? [];
      expect(new Set(presets.map((p) => p.slug)).size).toBe(presets.length);
      const headlines = new Set<string>();
      for (const p of presets) {
        expect(p.slug).toMatch(/^[a-z0-9-]+$/);
        expect(p.metaTitle.length, p.metaTitle).toBeLessThanOrEqual(60);
        expect(p.metaDescription.length, p.metaDescription).toBeLessThanOrEqual(158);
        const a = c.presetAnswer!(p.values);
        expect(a.bullets.length).toBeGreaterThanOrEqual(3);
        expect(a.headline).not.toMatch(/NaN|undefined|Infinity/);
        for (const b of a.bullets) expect(b).not.toMatch(/NaN|undefined|Infinity/);
        headlines.add(a.headline);
      }
      expect(headlines.size).toBe(presets.length);
    }
  });

  it("preset counts match the plan", () => {
    const [roof, pitch, metal] = calculators;
    expect(roof.presets?.length).toBe(29);
    expect(pitch.presets?.length).toBe(11);
    expect(metal.presets?.length).toBe(8);
  });
});
