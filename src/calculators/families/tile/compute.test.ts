import { describe, expect, it } from "vitest";
import {
  autoGrout,
  autoMortar,
  autoTrowel,
  backerPlan,
  boxPrice,
  computeTile,
  fastenersPerSheet,
  fmtJoint,
  groutNeed,
  installedRange,
  jointVolumeIn3,
  netArea,
  packPlan,
  patternWaste,
  pieceModuleSqFt,
  thinsetBags,
  thinsetCoverage,
  tileCount,
  tileDims,
  waterproofPlan,
  type TileInput,
} from "./compute";
import { backer, grout, mortar, TILE_FORMATS } from "./data";
import { TILE_PRESETS, tileInputFrom, TILE_DEFAULTS } from "./tile-model";
import { THINSET_DEFAULTS, thinsetInputFrom } from "./thinset-model";
import { GROUT_DEFAULTS, groutInputFrom } from "./grout-model";
import { BACKER_DEFAULTS, backerInputFrom } from "./backer-model";

const base: TileInput = {
  project: "floor",
  surfaces: [{ l: 5, w: 8 }],
  openings: [],
  sizeId: "12x24",
  price: 2.49,
  jointIn: 0.125,
  pattern: "straight",
  wastePct: null,
  atticPct: 0,
  trowelId: "auto",
  mortarId: "auto",
  groutId: "auto",
  backerId: "none",
  waterproof: "none",
};

describe("area", () => {
  it("sums surfaces and subtracts openings, never below zero", () => {
    expect(netArea([{ l: 3, w: 7 }, { l: 5, w: 7 }, { l: 3, w: 7 }]).net).toBe(77);
    expect(netArea([{ l: 10, w: 8 }], [{ l: 3, w: 7 }]).net).toBe(59);
    expect(netArea([{ l: 2, w: 2 }], [{ l: 3, w: 3 }]).net).toBe(0);
    expect(netArea([{ l: -4, w: 5 }]).net).toBe(0);
  });
});

describe("tile count (module method)", () => {
  it("5x8 bath in 12x24 (Venato, 7 per box): 23 pieces at 10% → 4 boxes (research worked example)", () => {
    const d = tileDims("12x24");
    const t = tileCount({ areaSqFt: 40, dims: d, jointIn: 0.125, wastePct: 10 });
    expect(t.pieces).toBe(23);
    expect(t.boxes).toBe(4);
    expect(t.boxSqFt).toBeCloseTo(13.37, 1); // carton says 13.44 sq ft
  });
  it("3x6 subway: 80 pieces = 10 sq ft per box and about 7.7 pieces per sq ft with a 1/8 joint", () => {
    const d = tileDims("3x6");
    expect(tileCount({ areaSqFt: 1, dims: d, jointIn: 0, wastePct: 0 }).boxSqFt).toBeCloseTo(10, 5);
    expect(1 / pieceModuleSqFt(d, 0.125)).toBeCloseTo(7.53, 1);
  });
  it("mosaic sheets count by the sheet; attic stock adds boxes", () => {
    const d = tileDims("mosaic", undefined, 1);
    expect(tileCount({ areaSqFt: 30, dims: d, jointIn: 0.0625, wastePct: 10 }).boxes).toBe(33);
    const a = tileCount({ areaSqFt: 100, dims: tileDims("12x12"), jointIn: 0.125, wastePct: 10, atticPct: 10 });
    expect(a.attic).toBeGreaterThan(0);
    expect(a.boxes * 17).toBeGreaterThanOrEqual(a.pieces + a.attic);
  });
  it("handles zero and huge areas", () => {
    expect(tileCount({ areaSqFt: 0, dims: tileDims("12x12"), jointIn: 0.125, wastePct: 10 }).boxes).toBe(0);
    expect(tileCount({ areaSqFt: 100000, dims: tileDims("24x48"), jointIn: 0.125, wastePct: 15 }).boxes).toBeGreaterThan(4000);
  });
  it("custom tile uses the carton numbers", () => {
    const d = tileDims("custom", { l: 8, w: 48, pcs: 6, t: 0.4 });
    expect(d.longIn).toBe(48);
    expect(d.pcsPerBox).toBe(6);
    expect(boxPrice(d, 3)).toBeCloseTo(6 * (8 * 48) / 144 * 3, 6);
  });
  it("waste: pattern base, 15% for 24-in formats, +5% in small rooms", () => {
    expect(patternWaste("straight", 11.81, 100)).toBe(10);
    expect(patternWaste("straight", 23.5, 100)).toBe(15);
    expect(patternWaste("herringbone", 23.5, 100)).toBe(20);
    expect(patternWaste("diagonal", 11.81, 30)).toBe(20);
  });
});

describe("thinset", () => {
  it("generic 50-lb bag covers 55 sq ft with a 1/4 x 3/8 notch (conservative minimum)", () => {
    expect(thinsetCoverage(mortar("basic"), "sq38").cov).toBe(55);
  });
  it("100 sq ft of 12x24: VersaBond LHT at 1/4 x 3/8 = 2 bags (60 sq ft/bag)", () => {
    expect(thinsetBags({ areaSqFt: 100, mortarId: "versabond-lht", trowelId: "sq38", backButter: false }).bags).toBe(2);
  });
  it("100 sq ft of 12x24 at 1/2 notch coverage (42) + back-butter = 3.02 → 4 bags (verifier)", () => {
    const r = thinsetBags({ areaSqFt: 100, mortarId: "versabond", trowelId: "u30", backButter: true });
    expect(r.cov).toBe(42);
    expect(r.bbBags).toBeCloseTo(0.4, 2);
    expect(r.exact).toBeCloseTo(3.02, 2);
    expect(r.bags).toBe(4);
  });
  it("ratio model fills a missing trowel row; V-notch falls back to the store-brand row", () => {
    const vl = thinsetCoverage(mortar("versabond-lite"), "sq12");
    expect(vl.basis).toBe("ratio");
    expect(vl.cov).toBeCloseTo(45, 5);
    expect(thinsetCoverage(mortar("ultraflex2"), "v")).toEqual({ cov: 110, basis: "fallback" });
  });
  it("warns about non-LHT mortar on large tile and unrecommended trowels", () => {
    expect(thinsetBags({ areaSqFt: 50, mortarId: "ultraflex2", trowelId: "sq38", backButter: true, longIn: 23.5 }).warnings.length).toBe(1);
    expect(thinsetBags({ areaSqFt: 50, mortarId: "prolite", trowelId: "sq12", backButter: true, longIn: 23.5 }).warnings[0]).toMatch(/no longer recommends/);
    expect(thinsetBags({ areaSqFt: 0, mortarId: "basic", trowelId: "sq14", backButter: false }).bags).toBe(0);
  });
  it("auto trowel and mortar by tile size", () => {
    expect(autoTrowel(tileDims("mosaic"))).toBe("v");
    expect(autoTrowel(tileDims("3x6"))).toBe("sq14");
    expect(autoTrowel(tileDims("12x12"))).toBe("sq38");
    expect(autoTrowel(tileDims("12x24"))).toBe("u30");
    expect(autoMortar(tileDims("12x24"))).toBe("versabond");
    expect(autoMortar(tileDims("12x12"))).toBe("basic");
  });
});

describe("grout (module method, K calibrated to maker tables)", () => {
  const perPack = (id: string, L: number, W: number, J: number, T: number, lb: number) => lb / (jointVolumeIn3(1, L, W, J, T) * grout(id).k!);
  it("Keracolor S: 383 sq ft per 25 lb at 12x12, 1/8 joint (MAPEI TDS)", () => {
    expect(perPack("keracolor-s", 12, 12, 0.125, 0.375, 25)).toBeCloseTo(383, -1);
  });
  it("Polyblend Plus sanded: 348 sq ft per 25 lb at 12x12, 1/8 joint (Custom)", () => {
    expect(perPack("polyblend-sanded", 12, 12, 0.125, 0.375, 25)).toBeCloseTo(348, -1);
  });
  it("Prism: 461 sq ft per 17 lb at 12x24, 1/8 joint (Custom)", () => {
    expect(perPack("prism", 24, 12, 0.125, 0.375, 17)).toBeCloseTo(461, -1);
  });
  it("30 sq ft 3x6 x 10 mm subway, 1/16 joint: ~52 in³, ~3.3 lb of Ultracolor Plus FA → one 10-lb bag", () => {
    const r = groutNeed({ areaSqFt: 30, longIn: 6, shortIn: 3, thickIn: 0.394, jointIn: 0.0625, groutId: "ucp-fa" });
    expect(r.volIn3).toBeCloseTo(52, 0);
    expect(r.lb!).toBeCloseTo(3.3, 1);
    expect(r.plan.lines).toEqual([{ pack: grout("ucp-fa").packs[1], count: 1 }]);
  });
  it("pre-mixed grout is counted in pails by joint volume; joint-width limits warn", () => {
    const r = groutNeed({ areaSqFt: 100, longIn: 23.5, shortIn: 11.7, thickIn: 0.354, jointIn: 0.125, groutId: "fusion-pro" });
    expect(r.lb).toBeNull();
    expect(r.plan.amount).toBeGreaterThanOrEqual(r.volWithExtraIn3);
    expect(groutNeed({ areaSqFt: 10, longIn: 6, shortIn: 3, thickIn: 0.4, jointIn: 0.25, groutId: "keracolor-u" }).warnings.length).toBe(1);
    expect(groutNeed({ areaSqFt: 0, longIn: 6, shortIn: 3, thickIn: 0.4, jointIn: 0.125, groutId: "keracolor-s" }).plan.units).toBe(0);
  });
  it("mosaic chips use the heavier mosaic factor", () => {
    const a = groutNeed({ areaSqFt: 10, longIn: 1, shortIn: 1, thickIn: 0.25, jointIn: 0.0625, groutId: "keracolor-s" });
    expect(a.lb! / a.volWithExtraIn3).toBeCloseTo(0.0735, 4);
    expect(autoGrout(0.0625)).toBe("keracolor-u");
    expect(autoGrout(0.125)).toBe("keracolor-s");
    expect(fmtJoint(0.1875)).toBe("3/16");
  });
});

describe("pack plans", () => {
  it("picks the cheapest priced combination", () => {
    const g = grout("ucp-fa").packs;
    expect(packPlan(40, g).lines.map((l) => [l.pack.amount, l.count])).toEqual([[25, 2]]);
    expect(packPlan(3.3, g).cost).toBeCloseTo(20.54, 2);
  });
  it("uses least material when prices are missing; zero need buys nothing", () => {
    expect(packPlan(30, grout("polyblend-sanded").packs).amount).toBe(32);
    expect(packPlan(0, grout("polyblend-sanded").packs).units).toBe(0);
  });
});

describe("backer board", () => {
  it("fasteners per sheet: 3x5 floor 54, 3x5 wall 27, 4x8 wall 52 (8 in o.c.; studs 16 in)", () => {
    expect(fastenersPerSheet(backer("hardie-14"), "floor")).toBe(54);
    expect(fastenersPerSheet(backer("durock-12"), "wall")).toBe(27);
    expect(fastenersPerSheet(backer("goboard-4x8"), "wall")).toBe(52);
    expect(fastenersPerSheet(backer("wedi-3x5"), "wall")).toBe(15);
  });
  it("tub alcove ~60 sq ft → 5 sheets of 3x5 (research worked example)", () => {
    const r = backerPlan({ areaSqFt: 60, backerId: "durock-12", surface: "wall" });
    expect(r.sheets).toBe(5);
    expect(r.under).toBeNull();
    expect(r.tapeFt).toBe(32);
  });
  it("floors add thinset under cement board and warn about 1/4 in board on walls", () => {
    const f = backerPlan({ areaSqFt: 40, backerId: "hardie-14", surface: "floor" });
    expect(f.sheets).toBe(3);
    expect(f.under!.bags).toBe(1);
    expect(backerPlan({ areaSqFt: 40, backerId: "hardie-14", surface: "wall" }).warnings.length).toBe(1);
    expect(backerPlan({ areaSqFt: 0, backerId: "hardie-14", surface: "floor" }).sheets).toBe(0);
  });
});

describe("waterproofing", () => {
  it("3x5 shower: walls 77 sq ft + pan 22 sq ft of RedGard ≈ 2.1 gal; HYDRO BAN ≈ 2.2 gal → 3 × 1 gal", () => {
    expect(waterproofPlan("redgard", 77, 22).need).toBeCloseTo(2.145, 2);
    const h = waterproofPlan("hydroban", 77, 22);
    expect(h.need).toBeCloseTo(2.18, 2);
    expect(h.plan.lines).toEqual([{ pack: { amount: 1, label: "1-gal pail", price: 105 }, count: 3 }]);
  });
  it("KERDI for 77 sq ft of walls → one 108 sq ft roll", () => {
    const k = waterproofPlan("kerdi", 77);
    expect(k.plan.lines.map((l) => [l.pack.amount, l.count])).toEqual([[108, 1]]);
    expect(k.bondBags).toBe(1);
  });
});

describe("whole job", () => {
  it("5x8 floor in 12x24 with defaults", () => {
    const r = computeTile(base);
    expect(r.area.net).toBe(40);
    expect(r.waste).toBe(15);
    expect(r.tiles.boxes).toBe(4);
    expect(r.thinset.bags).toBe(2);
    expect(r.backButter).toBe(true);
    expect(r.materialCost).toBeGreaterThan(0);
  });
  it("installed cost applies pattern and mosaic premiums", () => {
    const [lo, hi] = installedRange("floor", "herringbone", 100, false);
    expect(lo).toBeCloseTo(100 * 16.38 * 1.2, 4);
    expect(hi).toBeCloseTo(100 * 20.21 * 1.2, 4);
  });
  it("warns on wall tile used on a floor, ½ offset on long tile, and an unprotected shower", () => {
    expect(computeTile({ ...base, sizeId: "3x6" }).warnings.some((w) => w.includes("wall tile"))).toBe(true);
    expect(computeTile({ ...base, pattern: "offset12" }).warnings.some((w) => w.includes("A108.02"))).toBe(true);
    expect(computeTile({ ...base, project: "shower" }).warnings.some((w) => w.includes("membrane"))).toBe(true);
  });
  it("every tile format produces a finite answer", () => {
    for (const f of TILE_FORMATS) {
      const r = computeTile({ ...base, sizeId: f.id, custom: { l: 24, w: 12, pcs: 8, t: 0.375 } });
      expect(Number.isFinite(r.materialCost)).toBe(true);
      expect(r.tiles.boxes).toBeGreaterThan(0);
    }
  });
});

describe("models and presets", () => {
  it("defaults map to inputs for every calculator", () => {
    expect(computeTile(tileInputFrom(TILE_DEFAULTS)).tiles.boxes).toBeGreaterThan(0);
    expect(thinsetBags(thinsetInputFrom(THINSET_DEFAULTS)).bags).toBeGreaterThan(0);
    expect(groutNeed(groutInputFrom(GROUT_DEFAULTS)).plan.units).toBeGreaterThan(0);
    expect(backerPlan(backerInputFrom(BACKER_DEFAULTS)).sheets).toBeGreaterThan(0);
  });
  it("tile presets have unique slugs and materially different answers", () => {
    const slugs = new Set(TILE_PRESETS.map((p) => p.slug));
    expect(slugs.size).toBe(TILE_PRESETS.length);
    const answers = new Set(TILE_PRESETS.map((p) => { const r = computeTile(tileInputFrom(p.values)); return `${r.tiles.boxes}-${r.area.net}-${r.dims.format.id}`; }));
    expect(answers.size).toBe(TILE_PRESETS.length);
    for (const p of TILE_PRESETS) {
      expect(p.metaTitle.length).toBeLessThanOrEqual(60);
      expect(p.metaDescription.length).toBeLessThanOrEqual(158);
    }
  });
});
