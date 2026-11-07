import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FENCE_STYLE_IDS, styleDefaults } from "./fence-model";
import { calculators } from "./index";

describe("calculators render on the server for every preset", () => {
  it.each(calculators.map((e) => [e.meta.slug, e] as const))("%s", (_slug, entry) => {
    expect(renderToStaticMarkup(createElement(entry.Calculator, {}))).toContain("Save to project");
    for (const p of entry.presets ?? []) expect(() => renderToStaticMarkup(createElement(entry.Calculator, { initial: p.values }))).not.toThrow();
    expect(renderToStaticMarkup(createElement(entry.Content))).toContain("<h2>");
  });
  it("every fence style renders loops, gates, frost and empty layouts", () => {
    const fence = calculators.find((c) => c.meta.slug === "fence-calculator")!;
    for (const s of FENCE_STYLE_IDS) {
      const busy = renderToStaticMarkup(createElement(fence.Calculator, { initial: { ...styleDefaults(s), runs: 4, loop: true, wg: 2, dg: 1, frost: 42, set: "mixed", mix: "cm80" } }));
      expect(busy).toContain("gate");
      expect(() => renderToStaticMarkup(createElement(fence.Calculator, { initial: { ...styleDefaults(s), runs: 1, r1: 0 } }))).not.toThrow();
    }
  });
});
