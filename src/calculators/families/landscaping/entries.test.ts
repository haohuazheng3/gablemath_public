import { describe, expect, it } from "vitest";
import { calculators } from "./index";

// Page-level contract checks: titles and descriptions fit the SERP, slugs are unique and every preset
// gives its own answer (Google's scaled-content policy punishes near-duplicate pages).
describe.each(calculators.map((c) => [c.meta.slug, c] as const))("%s", (_slug, entry) => {
  const { meta } = entry;
  const presets = entry.presets ?? [];

  it("meta fits search snippets", () => {
    expect(meta.metaTitle.length).toBeLessThanOrEqual(60);
    expect(meta.metaDescription.length).toBeLessThanOrEqual(158);
    expect(meta.metaDescription).toMatch(/\d/);
    expect(meta.faq.length).toBeGreaterThanOrEqual(5);
    expect(meta.faq.length).toBeLessThanOrEqual(8);
    expect(meta.outputs.length).toBeGreaterThanOrEqual(3);
    expect(meta.outputs.length).toBeLessThanOrEqual(5);
  });

  it("presets have unique slugs, short titles and distinct answers", () => {
    const slugs = presets.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of presets) {
      expect(p.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(p.metaTitle.length, p.slug).toBeLessThanOrEqual(60);
      expect(p.metaDescription.length, p.slug).toBeLessThanOrEqual(158);
    }
    const answers = presets.map((p) => entry.presetAnswer!(p.values));
    const headlines = answers.map((a) => a.headline);
    expect(new Set(headlines).size).toBe(headlines.length);
    for (const a of answers) {
      expect(new Set(a.bullets).size).toBe(a.bullets.length);
      expect(a.bullets.length).toBeGreaterThanOrEqual(3);
      expect(a.headline).not.toMatch(/NaN|undefined|Infinity/);
      expect(a.bullets.join(" ")).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
});
