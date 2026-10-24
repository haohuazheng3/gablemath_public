import { describe, expect, it } from "vitest";
import { calculators } from "./index";

const entries = calculators;

describe.each(entries.map((e) => [e.meta.slug, e] as const))("%s pages", (_slug, entry) => {
  it("meta fits search snippets", () => {
    expect(entry.meta.metaTitle.length).toBeLessThanOrEqual(60);
    expect(entry.meta.metaDescription.length).toBeLessThanOrEqual(158);
    expect(entry.meta.faq.length).toBeGreaterThanOrEqual(5);
  });
  it("presets are unique, short and materially different", () => {
    const presets = entry.presets ?? [];
    expect(new Set(presets.map((p) => p.slug)).size).toBe(presets.length);
    for (const p of presets) {
      expect(p.slug).toMatch(/^[a-z0-9-]+$/);
      expect(p.metaTitle.length, p.metaTitle).toBeLessThanOrEqual(60);
      expect(p.metaDescription.length, p.metaDescription).toBeLessThanOrEqual(158);
    }
    const answers = presets.map((p) => entry.presetAnswer!(p.values));
    expect(new Set(answers.map((a) => a.headline)).size).toBe(presets.length);
    for (const a of answers) {
      expect(new Set(a.bullets).size).toBe(a.bullets.length);
      expect(a.bullets.length).toBeGreaterThanOrEqual(3);
    }
  });
});
