import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { calculators } from "./index";

// Server-render each calculator (as the preset pages do) for defaults, every preset and edge cases.
const BAD = /NaN|>undefined<|Infinity/;

function render(index: number, initial?: Record<string, unknown>) {
  return renderToStaticMarkup(createElement(calculators[index].Calculator, initial ? { initial } : {}));
}

describe("calculators render cleanly", () => {
  it("defaults and every preset", () => {
    calculators.forEach((c, i) => {
      expect(render(i)).not.toMatch(BAD);
      for (const p of c.presets ?? []) expect(render(i, p.values as Record<string, unknown>), p.slug).not.toMatch(BAD);
    });
  });

  it("shingle roof edge cases", () => {
    const cases = [
      { mode: "area" },
      { style: "hip" },
      { style: "complex", valleys: 40 },
      { pitch: 1 },
      { pitch: 22, product: "custom" },
      { l: 0 },
      { product: "atlas-pinnacle", layers: 2 },
      { iw: "none", vent: false, layers: 0 },
    ];
    for (const c of cases) expect(render(0, c), JSON.stringify(c)).not.toMatch(BAD);
  });

  it("pitch edge cases", () => {
    for (const c of [{ mode: "angle", angle: 30 }, { mode: "measure", mRun: 0 }, { span: 0 }, { rise: 0 }]) expect(render(1, c), JSON.stringify(c)).not.toMatch(BAD);
  });

  it("metal roof edge cases", () => {
    for (const c of [{ style: "shed" }, { profile: "5v", stock: true }, { l: 0 }, { pitch: 0.25 }, { w: 80 }]) expect(render(2, c), JSON.stringify(c)).not.toMatch(BAD);
  });
});
