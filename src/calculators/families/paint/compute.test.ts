import { describe, expect, it } from "vitest";
import {
  autoTrimLf,
  bmGallonsQuarts,
  cheapestPack,
  computeExterior,
  computeRoom,
  computeStain,
  gableArea,
  gallonsFor,
  packOnly,
  packText,
  resolvePrices,
  stainAreas,
  stainPlan,
  stainRate,
  swGallonsPerCoat,
  trimArea,
} from "./compute";
import { INTERIOR_PRIMERS, TYPICAL_GALLON, WALL_PAINTS, stain, type PackPrices } from "./data";
import { EXTERIOR_DEFAULTS, exteriorInputFrom } from "./exterior-model";
import { ROOM_DEFAULTS, roomInputFrom } from "./room-model";
import { STAIN_DEFAULTS, stainInputFrom } from "./stain-model";

const room = (over: Partial<typeof ROOM_DEFAULTS>) => computeRoom(roomInputFrom({ ...ROOM_DEFAULTS, ...over }));
const house = (over: Partial<typeof EXTERIOR_DEFAULTS>) => computeExterior(exteriorInputFrom({ ...EXTERIOR_DEFAULTS, ...over }));
const deck = (over: Partial<typeof STAIN_DEFAULTS>) => computeStain(stainInputFrom({ ...STAIN_DEFAULTS, ...over }));
const priced = (prices: PackPrices) => ({ prices, tags: {} });
const emerald = WALL_PAINTS.find((p) => p.id === "sw-emerald")!;

describe("Sherwin-Williams calculator reproduced (AjaxPaintCalculator responses)", () => {
  it("12×12×8 room, 1 door, 2 windows → 333 sq ft, 0.9 gal per coat", () => {
    const r = room({});
    expect(r.sw.areaSqFt).toBe(333);
    expect(r.sw.perCoat).toBe(0.9);
    expect(r.wallNetSqFt).toBe(333);
  });
  it("rounds up to 0.1 gal per coat: 144 → 0.4, 2,022 → 5.8 at 350, 192 deck → 0.8 at 250", () => {
    expect(swGallonsPerCoat(144, 400)).toBe(0.4);
    expect(swGallonsPerCoat(2022, 350)).toBe(5.8);
    expect(swGallonsPerCoat(192, 250)).toBe(0.8);
    expect(swGallonsPerCoat(380, 400)).toBe(1);
  });
  it("40 LF of 6 in baseboard = 20 sq ft of trim", () => {
    expect(trimArea(40, 6)).toBe(20);
    expect(trimArea(0, 6)).toBe(0);
  });
  it("30 × 10 ft wall with an 8 ft peak = 420 sq ft, 1.2 gal at 350", () => {
    const r = computeExterior({ ...exteriorInputFrom(EXTERIOR_DEFAULTS), perimeterFt: 30, wallHeightFt: 10, gables: 1, gableWidthFt: 30, gableRiseFt: 8, doors: 0, windows: 0, trimLf: 0 });
    expect(gableArea(30, 8)).toBe(120);
    expect(r.grossSqFt).toBe(420);
    expect(r.sw.perCoat).toBe(1.2);
  });
  it("exterior quick calc: 128 × 18 ft, 2 doors, 16 windows → 2,022 sq ft", () => {
    const r = house({ gables: 0, trimAuto: false, trimLf: 0 });
    expect(r.sidingSqFt).toBe(2022);
    expect(r.sw.perCoat).toBe(5.8);
  });
  it("deck railings: 40 × 3 ft = 72 sq ft plain, 240 with spindles", () => {
    const base = stainInputFrom(STAIN_DEFAULTS);
    expect(stainAreas({ ...base, deck: { ...base.deck, l: 0, steps: 0, railLf: 40, railH: 3, spindles: false } }).railSqFt).toBeCloseTo(72, 6);
    expect(stainAreas({ ...base, deck: { ...base.deck, l: 0, steps: 0, railLf: 40, railH: 3, spindles: true } }).railSqFt).toBe(240);
  });
});

describe("Benjamin Moore calculator reproduced (calculator code)", () => {
  it("12×12×8, 1 door, 2 windows: 339 sq ft (12 sq ft windows) → 1.94 gal → 2 gallons, 0 quarts", () => {
    const r = room({});
    expect(r.bm.areaSqFt).toBe(339);
    expect(r.bm.gallons).toBe(2);
    expect(r.bm.quarts).toBe(0);
  });
  it("splits into gallons + quarts", () => {
    expect(bmGallonsQuarts(450)).toEqual({ gallons: 2, quarts: 3 }); // 2.57 gal
    expect(bmGallonsQuarts(500)).toEqual({ gallons: 3, quarts: 0 }); // 2.86 gal → 4 quarts roll over
    expect(bmGallonsQuarts(0)).toEqual({ gallons: 0, quarts: 0 });
  });
});

describe("cheapest container mix (Oct 2026 prices)", () => {
  const sw = resolvePrices(emerald, "interior");
  it("SW Emerald: 1.9 gal → 2 gal; 2.09 gal → 2 gal + 1 qt", () => {
    expect(packText(cheapestPack(1.9, sw))).toBe("2 gal");
    expect(packText(cheapestPack(2.09, sw))).toBe("2 gal + 1 qt");
  });
  it("two quarts beat a gallon at SW (37%), but three quarts never do", () => {
    expect(packText(cheapestPack(0.4, sw))).toBe("2 qt");
    expect(packText(cheapestPack(0.6, sw))).toBe("1 gal");
  });
  it("a 5-gal pail wins just under 5 gallons ($307.45 vs 4 gal + 3 qt)", () => {
    const p = cheapestPack(4.6, sw);
    expect(packText(p)).toBe("1 × 5 gal");
    expect(p.cost).toBe(307.45);
  });
  it("KILZ 2's 3.5-gal pail ($65) beats gallons and the 5-gal at 3.4 gal", () => {
    const kilz = resolvePrices(INTERIOR_PRIMERS.find((p) => p.id === "kilz2")!, "primer");
    expect(packText(cheapestPack(3.4, kilz))).toBe("1 × 3.5 gal");
  });
  it("a 5-gal that costs more per gallon (KILZ 3: $165 vs 5 × $32.97) is skipped", () => {
    expect(packText(cheapestPack(5, priced({ gal: 32.97, p5: 165 })))).toBe("5 gal");
  });
  it("ties go to fewer containers", () => {
    expect(packText(cheapestPack(5, priced({ gal: 20, p5: 100 })))).toBe("1 × 5 gal");
  });
  it("zero, missing prices and huge jobs", () => {
    expect(cheapestPack(0, sw).lines).toEqual([]);
    expect(cheapestPack(2, priced({})).gallons).toBe(0);
    const big = cheapestPack(2500.3, sw);
    expect(big.gallons).toBeGreaterThanOrEqual(2500.3);
    expect(big.leftoverGal).toBeLessThan(5);
  });
  it("whole-gallon comparison", () => {
    expect(packOnly(2.09, sw, ["gal"])?.gallons).toBe(3);
    expect(packOnly(2, resolvePrices(WALL_PAINTS[0], "interior"), ["p5"])).toBeNull();
  });
});

describe("prices", () => {
  it("estimates the quart at 40% of the gallon when only the gallon is listed (BM Regal Select $84.99)", () => {
    const r = resolvePrices(WALL_PAINTS.find((p) => p.id === "bm-regal-select")!, "interior");
    expect(r.prices.qt).toBe(34);
    expect(r.tags.qt).toBe("estimate");
    expect(r.tags.gal).toBe("online");
  });
  it("falls back to the median online gallon price of the category", () => {
    expect(TYPICAL_GALLON.interior).toBe(57.59);
    expect(TYPICAL_GALLON.exterior).toBe(66.89);
    expect(TYPICAL_GALLON.primer).toBe(36.59);
    expect(TYPICAL_GALLON.stain).toBe(57.99);
    expect(resolvePrices(WALL_PAINTS[0], "interior").tags.gal).toBe("typical");
  });
});

describe("interior rooms", () => {
  it("research worked example: 333 sq ft × 2 coats at 350 = 1.90 gal → 2 gallons; ceiling 144 sq ft → 1 gallon", () => {
    const r = room({ ceiling: true });
    const walls = r.needs.find((n) => n.key === "walls")!;
    expect(walls.gallons).toBeCloseTo(1.903, 3);
    expect(packText(walls.pack)).toBe("2 gal");
    const ceiling = r.needs.find((n) => n.key === "ceiling")!;
    expect(ceiling.gallons).toBeCloseTo(0.823, 3);
    expect(packText(ceiling.pack)).toBe("1 gal");
  });
  it("baseboard ~45 LF × 6 in = 22.5 sq ft; casings 17 LF per door and 16 per window", () => {
    const r = room({ trim: true });
    expect(r.baseboardLf).toBe(45);
    expect(r.casingLf).toBe(49);
    expect(r.trimSqFt).toBeCloseTo(22.5 + 12.25, 6);
    expect(r.wallNetSqFt).toBeCloseTo(333 - 34.75, 6); // trim covers wall, as SW subtracts it
    expect(r.needs.find((n) => n.key === "trim")?.pack.lines.every((l) => l.size === "qt")).toBe(true);
  });
  it("new drywall adds porous-rate primer for walls and ceiling (KILZ 2 at 300)", () => {
    const r = room({ primer: "porous", ceiling: true });
    const primer = r.needs.find((n) => n.key === "primer")!;
    expect(primer.areaSqFt).toBe(333 + 144);
    expect(primer.gallons).toBeCloseTo(477 / 300, 6);
    expect(packText(primer.pack)).toBe("2 gal"); // 3 KILZ quarts ($29.91) cost more than a gallon ($23.97)
  });
  it("spot priming is one quart", () => {
    expect(room({ primer: "spot" }).needs.find((n) => n.key === "primer")?.gallons).toBe(0.25);
  });
  it("deep colors add a coat unless primed", () => {
    expect(room({ deep: true }).topcoats).toBe(3);
    expect(room({ deep: true, primer: "sealed" }).topcoats).toBe(2);
  });
  it("texture, spraying and the touch-up quart increase the walls", () => {
    const base = room({}).needs[0].gallons;
    expect(room({ texture: "heavy" }).needs[0].gallons).toBeCloseTo(base / 0.75, 6);
    expect(room({ loss: 25 }).needs[0].gallons).toBeCloseTo(base * 1.25, 6);
    expect(room({ touchUp: true }).needs[0].gallons).toBeCloseTo(base + 0.25, 6);
  });
  it("several rooms and a closet add up", () => {
    const r = room({ rooms: 2, l2: 10, w2: 10, closet: true, closetW: 5, closetD: 2 });
    expect(r.perimeterFt).toBe(48 + 40);
    expect(r.closetWallSqFt).toBe(9 * 8);
    expect(r.wallGrossSqFt).toBe(88 * 8 + 72);
  });
  it("cabinets and tile come off the wall area", () => {
    expect(room({ blocked: 100 }).wallNetSqFt).toBe(233);
  });
  it("empty or tiny inputs never go negative", () => {
    const r = room({ l1: 0, w1: 0, doors: 3 });
    expect(r.wallNetSqFt).toBe(0);
    expect(r.needs).toEqual([]);
    expect(r.supplies).toEqual([]);
    expect(room({ l1: 2, w1: 2, h: 3, doors: 2 }).wallNetSqFt).toBe(0);
  });
  it("supplies scale: one drop cloth per 108 sq ft of floor when the ceiling is painted", () => {
    const r = room({ l1: 15, w1: 20, ceiling: true, h: 9 });
    expect(r.supplies.find((s) => s.id === "drop-cloth")?.qty).toBe(3);
    expect(r.supplies.some((s) => s.id === "pole")).toBe(true);
  });
});

describe("house exteriors", () => {
  it("2,000 sq ft two-story worked example: 2,278 sq ft; 2 coats = 15.2–18.2 gal at 300–250", () => {
    const r = house({ trimAuto: false, trimLf: 0 });
    expect(r.sidingSqFt).toBe(2278);
    expect(gallonsFor(2278, 2, 300, 0)).toBeCloseTo(15.19, 2);
    expect(house({ product: "sw-emerald-ext", cov: 250, trimAuto: false, trimLf: 0 }).needs[0].gallons).toBeCloseTo(18.22, 2);
  });
  it("one-story 40×50, 8 ft walls, two 40 ft gables with 8 ft rise, 2 doors, 12 windows ≈ 1,540 sq ft", () => {
    const r = house({ len: 40, wid: 50, h: 8, gableW: 40, rise: 8, windows: 12, trimAuto: false, trimLf: 0 });
    expect(r.sidingSqFt).toBe(1538);
  });
  it("siding type changes the paint, not the area", () => {
    const smooth = house({ siding: "vinyl" });
    const stucco = house({ siding: "stucco-rough" });
    expect(stucco.sidingSqFt).toBe(smooth.sidingSqFt);
    expect(stucco.needs[0].gallons).toBeCloseTo(smooth.needs[0].gallons / 0.4, 6);
  });
  it("Loxon on rough stucco plans at SW's 80 sq ft/gal", () => {
    const r = house({ siding: "stucco-rough", primer: true, primerProduct: "sw-loxon", trimAuto: false, trimLf: 0 });
    expect(r.needs.find((n) => n.key === "primer")?.gallons).toBeCloseTo(2278 / 80, 6);
  });
  it("auto trim: perimeter + rakes + casings", () => {
    const lf = autoTrimLf({ perimeterFt: 128, gables: 2, gableWidthFt: 32, gableRiseFt: 8, doors: 2, windows: 16, garageDoors: 0, garage: { w: 16, h: 7 } });
    expect(lf).toBe(Math.round(128 + 4 * Math.hypot(16, 8) + 34 + 256));
  });
  it("measured siding area replaces the footprint math", () => {
    const r = house({ measure: "area", area: 1800, doors: 0, windows: 0, garage: 0 });
    expect(r.sidingSqFt).toBe(1800);
    expect(r.gableSqFt).toBe(0);
  });
  it("garage doors are deducted", () => {
    expect(house({ garage: 1 }).sidingSqFt).toBe(2278 - 112);
  });
  it("range runs from the maker's high rate to the planning rate", () => {
    const r = house({ product: "sw-emerald-ext", cov: 250 });
    expect(r.range.lowGal).toBeLessThan(r.range.highGal);
    expect(r.range.highGal).toBeCloseTo(r.needs.filter((n) => n.key !== "primer").reduce((t, n) => t + n.gallons, 0), 6);
  });
});

describe("deck & fence stain", () => {
  it("12×16 deck at SW's 250 basis: 192 sq ft × 2 coats = 1.54 gal; 44 ft balustered railing adds 264 sq ft", () => {
    expect(gallonsFor(192, 2, 250, 0)).toBeCloseTo(1.536, 3);
    const r = deck({ steps: 0 });
    expect(r.floorSqFt).toBe(192);
    expect(r.railSqFt).toBe(264);
    expect(r.sw.perCoat).toBe(1.9); // 456 / 250 = 1.82 → 1.9
  });
  it("Defy Extreme: 100 sq ft per gallon for both coats → 192 sq ft = 1.92 gal", () => {
    const p = stainPlan(stain("defy-extreme"), 192, "weathered", 2, 0);
    expect(p.gallons).toBeCloseTo(1.92, 6);
  });
  it("Behr semi-transparent: 300 sq ft/gal first coat, 500 second", () => {
    const p = stainPlan(stain("behr-semi"), 300, "weathered", 2, 0);
    expect(p.coat1Gal).toBe(1);
    expect(p.laterGal).toBeCloseTo(0.6, 6);
  });
  it("Cabot DeckCorrect: 75 sq ft per gallon for its two coats", () => {
    expect(stainPlan(stain("cabot-deckcorrect"), 150, "weathered", 2, 0).gallons).toBeCloseTo(2, 6);
  });
  it("wood condition: middle of the range when new, low end when weathered, × 125/150 when rough", () => {
    expect(stainRate([250, 350], "new")).toBe(300);
    expect(stainRate([250, 350], "weathered")).toBe(250);
    expect(stainRate([250, 350], "rough")).toBeCloseTo(208.33, 2);
    expect(stainRate([100, 350], "rough", { new: 350, weathered: 200, rough: 150 })).toBe(150);
  });
  it("one-coat products stay at one coat", () => {
    expect(stainPlan(stain("cabot-semi"), 200, "weathered", 3, 0).coats).toBe(1);
  });
  it("stairs: 3 steps × 4 ft × (11 + 7¾ in) = 18.75 sq ft", () => {
    expect(deck({ railings: false }).stairSqFt).toBeCloseTo(18.75, 6);
  });
  it("Olympic rule of thumb: 192 sq ft → 2 gallons", () => {
    expect(deck({ railings: false, steps: 0 }).olympic).toBe("2 gallons");
  });
  it("fence: 100 ft × 6 ft both sides = 1,200 sq ft; shadowbox × 1.2", () => {
    expect(deck({ mode: "fence" }).totalSqFt).toBe(1200);
    expect(deck({ mode: "fence", sides: 1 }).totalSqFt).toBe(600);
    expect(deck({ mode: "fence", style: "shadowbox" }).totalSqFt).toBeCloseTo(1440, 6);
  });
  it("compares every product of the same opacity, cheapest first", () => {
    const r = deck({});
    expect(r.compare.length).toBeGreaterThan(5);
    expect(r.compare.every((c) => c.product.opacity === "semi")).toBe(true);
    for (let i = 1; i < r.compare.length; i++) expect(r.compare[i].pack.cost).toBeGreaterThanOrEqual(r.compare[i - 1].pack.cost);
  });
  it("zero-size job", () => {
    const r = deck({ dl: 0, railings: false, steps: 0 });
    expect(r.totalSqFt).toBe(0);
    expect(r.gallons).toBe(0);
    expect(r.supplies).toEqual([]);
  });
});
