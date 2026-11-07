import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { materialPatch as gravelMaterial } from "./gravel-model";
import { calculators } from "./index";
import { materialPatch as mulchMaterial } from "./mulch-model";
import { basePatch } from "./paver-base-model";
import { modePatch as soilMode } from "./topsoil-model";

// Extra states the presets don't reach: odd shapes, buy modes, bulk-only and bag-only materials.
const EXTRA: Record<string, Record<string, unknown>[]> = {
  "gravel-calculator": [{ buy: "bags" }, { buy: "pickup", shape: "circle" }, { shape: "sqft", layers: 2 }, { ...gravelMaterial(1, "river"), buy: "bags" }, { l1: 0 }],
  "mulch-calculator": [{ ...mulchMaterial("pinestraw", "bed") }, { ...mulchMaterial("rubber", "bed"), buy: "delivered" }, { shape: "circle", sections: 3 }, { mode: "topup", ex: 5 }],
  "topsoil-calculator": [{ ...soilMode("beds"), mat: "fill", bp: 0 }, { buy: "pickup", shape: "circle" }, { mat: "compost", bag: 0.75 }],
  "sand-calculator": [{ use: "pavers", d: 3 }, { sand: "mason", bp: 0, buy: "bags" }, { shape: "sqft", buy: "delivered" }],
  "paver-base-calculator": [{ ...basePatch("clear") }, { shape: "sqft", buy: "bags" }, { use: "driveway", bd: 4 }],
};

// Smoke test: every calculator renders for its defaults, every preset and the extra states, and every guide renders.
describe.each(calculators.map((c) => [c.meta.slug, c] as const))("%s renders", (slug, entry) => {
  it("default state and guide", () => {
    const html = renderToString(createElement(entry.Calculator, {}));
    expect(html).toContain('id="results"');
    expect(html).not.toMatch(/NaN|undefined|Infinity/);
    const guide = renderToString(createElement(entry.Content));
    expect(guide.length).toBeGreaterThan(2000);
    expect(guide).not.toMatch(/NaN|undefined|Infinity/);
  });
  it("every preset and edge state", () => {
    const states = [...(entry.presets ?? []).map((p) => p.values), ...(EXTRA[slug] ?? [])];
    for (const initial of states) {
      const html = renderToString(createElement(entry.Calculator, { initial }));
      expect(html, JSON.stringify(initial)).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
});
