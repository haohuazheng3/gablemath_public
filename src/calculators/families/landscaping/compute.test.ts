import { describe, expect, it } from "vitest";
import {
  areaOf,
  bagPriceFor,
  bagsFor,
  compareBuy,
  computeGravel,
  computeMulch,
  computePaverBase,
  computeSand,
  computeSoil,
  costOf,
  coveragePerCuyd,
  coveragePerTon,
  grownArea,
  liftsFor,
  orderVolume,
  perimeterOf,
  pickupTrips,
  resolveBuy,
  truckFor,
} from "./compute";
import { GRAVEL_DEFAULTS, gravelInputFrom, materialPatch as gravelMaterial, projectPatch as gravelUse } from "./gravel-model";
import { MULCH_DEFAULTS, modePatch, mulchInputFrom, materialPatch as mulchMaterial } from "./mulch-model";
import { PAVER_DEFAULTS, basePatch, paverInputFrom } from "./paver-base-model";
import { SAND_DEFAULTS, sandInputFrom, sandPatch } from "./sand-model";
import { TOPSOIL_DEFAULTS, modePatch as soilMode, soilBagPrice, topsoilInputFrom } from "./topsoil-model";

const gravel = (over: Partial<typeof GRAVEL_DEFAULTS>) => computeGravel(gravelInputFrom({ ...GRAVEL_DEFAULTS, ...over }));
const mulch = (over: Partial<typeof MULCH_DEFAULTS>) => computeMulch(mulchInputFrom({ ...MULCH_DEFAULTS, ...over }));
const soil = (over: Partial<typeof TOPSOIL_DEFAULTS>) => computeSoil(topsoilInputFrom({ ...TOPSOIL_DEFAULTS, ...over }));
const sand = (over: Partial<typeof SAND_DEFAULTS>) => computeSand(sandInputFrom({ ...SAND_DEFAULTS, ...over }));
const paver = (over: Partial<typeof PAVER_DEFAULTS>) => computePaverBase(paverInputFrom({ ...PAVER_DEFAULTS, ...over }));

describe("areas", () => {
  it("rectangles, circles and known square feet", () => {
    expect(areaOf({ shape: "rect", l: 10, w: 12 })).toBe(120);
    expect(areaOf({ shape: "circle", d: 10 })).toBeCloseTo(78.54, 2);
    expect(areaOf({ shape: "sqft", sqft: 250 })).toBe(250);
    expect(areaOf({ shape: "rect", l: 10, w: 0 })).toBe(0);
    expect(areaOf({ shape: "sqft", sqft: -5 })).toBe(0);
  });
  it("tree ring subtracts the trunk plus a 3 in gap (research worked example: 3 ft radius ring = 27.5 sq ft)", () => {
    expect(areaOf({ shape: "ring", d: 6, trunkIn: 6 })).toBeCloseTo(27.49, 2);
    // a ring smaller than its trunk clearance has no mulch area
    expect(areaOf({ shape: "ring", d: 0.5, trunkIn: 12 })).toBe(0);
  });
  it("perimeters and grown footprints", () => {
    expect(perimeterOf({ shape: "rect", l: 10, w: 12 })).toBe(44);
    expect(perimeterOf({ shape: "sqft", sqft: 100 })).toBe(0);
    expect(grownArea({ shape: "rect", l: 10, w: 12 }, 6)).toBe(22 * 24);
    expect(grownArea({ shape: "sqft", sqft: 100 }, 0.5)).toBeCloseTo(121, 6);
  });
});

describe("volume, coverage and packaging", () => {
  it("bags per cubic yard by bag size (27 cu ft ÷ bag)", () => {
    expect(bagsFor(27, 2)).toBe(14); // 13.5 → buy 14
    expect(bagsFor(27, 1.5)).toBe(18);
    expect(bagsFor(27, 1)).toBe(27);
    expect(bagsFor(27, 0.75)).toBe(36);
    expect(bagsFor(27, 0.5)).toBe(54);
    expect(bagsFor(27, 0)).toBe(0);
    expect(bagsFor(0, 2)).toBe(0);
  });
  it("one cubic yard covers 162 sq ft at 2 in and 108 at 3 in (Mulch Pros)", () => {
    expect(coveragePerCuyd(2)).toBe(162);
    expect(coveragePerCuyd(3)).toBe(108);
    expect(coveragePerCuyd(0)).toBe(0);
  });
  it("one ton of 2,700 lb/yd³ stone covers about 120 sq ft at 2 in (Mulch Pros)", () => {
    expect(coveragePerTon(2, 1.35)).toBeCloseTo(120, 0);
  });
  it("compaction and extra multiply the loose order", () => {
    const q = orderVolume(27, 1.33, 10);
    expect(q.cuydFinished).toBe(1);
    expect(q.cuydOrder).toBeCloseTo(1.463, 3);
    expect(orderVolume(-5).cuftOrder).toBe(0);
  });
  it("lifts of 3 in or less (Unilock)", () => {
    expect(liftsFor(4)).toBe(2);
    expect(liftsFor(6)).toBe(2);
    expect(liftsFor(10)).toBe(4);
    expect(liftsFor(0)).toBe(0);
  });
  it("trucks: single-axle to 5 t, tandems of 18 t above (Mulch Pros)", () => {
    expect(truckFor(0)).toEqual({ truck: "single-axle", loads: 0 });
    expect(truckFor(5)).toEqual({ truck: "single-axle", loads: 1 });
    expect(truckFor(6)).toEqual({ truck: "tandem", loads: 1 });
    expect(truckFor(40)).toEqual({ truck: "tandem", loads: 3 });
    expect(pickupTrips(2700, 1000)).toBe(3);
    expect(pickupTrips(2700, 0)).toBe(0);
  });
  it("bag prices scale per cubic foot only when the size has no dated price", () => {
    expect(bagPriceFor({ 2: 3.65 }, 2)).toEqual({ price: 3.65, estimated: false });
    expect(bagPriceFor({ 2: 3.65 }, 3)).toEqual({ price: 5.48, estimated: true });
    expect(bagPriceFor({}, 2)).toEqual({ estimated: false });
  });
});

describe("bags vs bulk", () => {
  it("dyed mulch break-even ≈ 3.9 yd with a $60 delivery (Mulch Pros worked example)", () => {
    const r = compareBuy({ cuyd: 1, bagCuft: 2, bagPrice: 3.65, bulkPerYd: 33.95, deliveryFee: 60, loads: 1 });
    expect(r.bagPerYd).toBeCloseTo(49.275, 3);
    expect(r.breakEvenYd).toBeCloseTo(3.9, 1);
    expect(r.cheaper).toBe("bags");
  });
  it("bulk wins on big jobs; bags win when they are cheaper per yard", () => {
    const big = compareBuy({ cuyd: 10, bagCuft: 2, bagPrice: 3.65, bulkPerYd: 33.95, deliveryFee: 60, loads: 1 });
    expect(big.cheaper).toBe("bulk");
    expect(resolveBuy("auto", big)).toBe("delivered");
    expect(costOf("pickup", big)).toBeCloseTo(339.5, 2);
    const cheapBags = compareBuy({ cuyd: 1, bagCuft: 2, bagPrice: 1, bulkPerYd: 40, deliveryFee: 60, loads: 1 });
    expect(cheapBags.breakEvenYd).toBeUndefined();
  });
  it("falls back to whichever side has a price", () => {
    const noBulk = compareBuy({ cuyd: 1, bagCuft: 0.5, bagPrice: 4.95, deliveryFee: 75, loads: 1 });
    expect(noBulk.cheaper).toBe("unknown");
    expect(resolveBuy("auto", noBulk)).toBe("bags");
    const noBag = compareBuy({ cuyd: 1, bagCuft: 0.5, bagPrice: 0, bulkPerYd: 100, deliveryFee: 75, loads: 1 });
    expect(resolveBuy("auto", noBag)).toBe("delivered");
    expect(resolveBuy("pickup", noBag)).toBe("pickup");
  });
});

describe("gravel", () => {
  it("20×20 at 4 in of #57 = 4.94 yd³ ≈ 6.7 tons (research worked example)", () => {
    const r = gravel({ ...gravelUse("cover"), ...gravelMaterial(1, "57"), l1: 20, w1: 20, d1: 4, extra: 0 });
    expect(r.layers[0].q.cuydOrder).toBeCloseTo(4.94, 2);
    expect(r.layers[0].tons).toBeCloseTo(6.67, 2);
    expect(r.layers[0].tonsLow).toBeCloseTo(6.42, 2);
    expect(r.layers[0].tonsHigh).toBeCloseTo(8.15, 2);
    expect(r.layers[0].factor).toBe(1);
  });
  it("compacted crusher run orders 1.33× loose: 10×10 at 6 in ≈ 3.5 t (research: 3.52 t at 1.90 t per compacted yd³)", () => {
    const r = gravel({ l1: 10, w1: 10, d1: 6, extra: 0 });
    const l = r.layers[0];
    expect(l.q.cuydFinished).toBeCloseTo(1.852, 3);
    expect(l.q.cuydOrder).toBeCloseTo(2.463, 3);
    expect(l.tons / 3.52).toBeGreaterThan(0.98);
    expect(l.tons / 3.52).toBeLessThan(1.03);
    expect(l.looseDepthIn).toBeCloseTo(7.98, 2);
    expect(l.lifts).toBe(2);
  });
  it("uncompacted base material is flagged", () => {
    expect(gravel({ c1: false }).warnings.some((w) => w.includes("compacted"))).toBe(true);
  });
  it("layered driveway sums both layers and plans tandem loads", () => {
    const r = gravel({ ...gravelUse("drive"), l1: 10, w1: 50, extra: 10 });
    expect(r.layers).toHaveLength(2);
    expect(r.totalTons).toBeCloseTo(r.layers[0].tons + r.layers[1].tons, 9);
    expect(r.layers[1].layer.material).toBe("57");
    expect(r.layers[0].truck.truck).toBe("tandem");
  });
  it("known-amount mode converts tons to yards with the material weight", () => {
    const r = gravel({ ...gravelMaterial(1, "57"), shape: "vol", vol: 1, vu: "ton" });
    expect(r.layers[0].q.cuydOrder).toBeCloseTo(1 / 1.35, 4);
    expect(r.layers).toHaveLength(1);
    expect(r.areaSqFt).toBe(0);
  });
  it("prices per yard and per ton compare on the same basis", () => {
    const perTon = gravel({ ...gravelMaterial(1, "57"), l1: 20, w1: 20, d1: 4, extra: 0 });
    expect(perTon.layers[0].bulkPerYd).toBeCloseTo(45 * 1.35, 6);
    const dg = gravel({ ...gravelMaterial(1, "dg") });
    expect(dg.layers[0].bulkPerYd).toBe(106.95);
  });
  it("zero and huge areas stay finite", () => {
    const zero = gravel({ l1: 0 });
    expect(zero.totalTons).toBe(0);
    expect(zero.layers[0].buy.bags).toBe(0);
    const huge = gravel({ l1: 1000, w1: 1000 });
    expect(Number.isFinite(huge.totalTons)).toBe(true);
    expect(huge.layers[0].truck.loads).toBeGreaterThan(100);
  });
});

describe("mulch", () => {
  it("100 sq ft at 3 in = 25 cu ft: 13 × 2 cu ft or 17 × 1.5 cu ft (research worked example)", () => {
    const r = mulch({ shape: "sqft", a1: 100, d: 3 });
    expect(r.q.cuftOrder).toBe(25);
    expect(r.q.cuydOrder).toBeCloseTo(0.926, 3);
    expect(r.bags).toBe(13);
    expect(r.bagsBySize.find((b) => b.size === 1.5)?.bags).toBe(17);
    expect(r.bagsBySize.find((b) => b.size === 3)?.bags).toBe(9);
  });
  it("at 2 in the same 100 sq ft takes 9 × 2 cu ft or 12 × 1.5 cu ft", () => {
    const r = mulch({ shape: "sqft", a1: 100, d: 2 });
    expect(r.bags).toBe(9);
    expect(r.bagsBySize.find((b) => b.size === 1.5)?.bags).toBe(12);
  });
  it("label coverage: a 2 cu ft bag covers 8 sq ft at 3 in (Vigoro)", () => {
    expect(mulch({ d: 3 }).coveragePerBagSqFt).toBe(8);
  });
  it("tree ring: 6 ft ring, 6 in trunk, 3 in deep ≈ 6.9 cu ft = 4 bags (research worked example)", () => {
    const v = { ...MULCH_DEFAULTS, ...modePatch("ring", MULCH_DEFAULTS) };
    const r = computeMulch(mulchInputFrom(v));
    expect(r.q.cuftOrder).toBeCloseTo(6.87, 2);
    expect(r.bags).toBe(4);
    expect(computeMulch(mulchInputFrom({ ...v, count: 5 })).bags).toBe(18);
  });
  it("top-up adds only the missing depth and stops when beds are already deep enough", () => {
    const v = { ...MULCH_DEFAULTS, ...modePatch("topup", MULCH_DEFAULTS), shape: "sqft", a1: 200 };
    const r = computeMulch(mulchInputFrom(v));
    expect(r.addDepthIn).toBe(1);
    expect(r.bags).toBe(9); // 200 × 1/12 = 16.7 cu ft
    const full = computeMulch(mulchInputFrom({ ...v, ex: 3 }));
    expect(full.bags).toBe(0);
    expect(full.warnings.some((w) => w.includes("no new mulch"))).toBe(true);
    expect(computeMulch(mulchInputFrom({ ...v, ex: 2, d: 5 })).warnings.some((w) => w.includes("in total"))).toBe(true);
  });
  it("playground: 10×12 set + 6 ft use zone at 12 in = 19.6 yd³ (CPSC worked example)", () => {
    const v = { ...MULCH_DEFAULTS, ...modePatch("play", MULCH_DEFAULTS) };
    const r = computeMulch(mulchInputFrom(v));
    expect(r.areaSqFt).toBe(528);
    expect(r.q.cuydOrder).toBeCloseTo(19.56, 2);
    expect(computeMulch(mulchInputFrom({ ...v, d: 6 })).warnings.some((w) => w.includes("CPSC"))).toBe(true);
    const rubber = { ...v, ...mulchMaterial("rubber", "play") };
    expect(rubber.d).toBe(6);
  });
  it("pine straw is counted in bales of ~40 sq ft (Mulch Pros)", () => {
    const r = mulch({ ...mulchMaterial("pinestraw", "bed"), shape: "sqft", a1: 400 });
    expect(r.bales).toBe(10);
    expect(r.bags).toBe(0);
  });
  it("estimated weight uses ~600 lb per yd³ of wood mulch", () => {
    expect(mulch({ shape: "sqft", a1: 324, d: 1 }).weightLb).toBeCloseTo(600, 6);
    expect(mulch({ ...mulchMaterial("rubber", "bed") }).weightLb).toBeUndefined();
  });
});

describe("topsoil & raised beds", () => {
  it("4×8 raised bed, 12 in deep: 32 cu ft, 35.2 with 10% settling", () => {
    const r = soil({ ...soilMode("beds") });
    expect(r.q.cuftFinished).toBe(32);
    expect(r.q.cuftOrder).toBeCloseTo(35.2, 6);
    expect(r.bags).toBe(24); // 1.5 cu ft
    expect(r.bagsBySize.find((b) => b.size === 1)?.bags).toBe(36);
    expect(r.bagsBySize.find((b) => b.size === 0.75)?.bags).toBe(47);
    expect(r.blendSplit?.topsoilCuft).toBeCloseTo(17.6, 6);
  });
  it("several beds multiply and report per-bed bags", () => {
    const r = soil({ ...soilMode("beds"), beds: 3 });
    expect(r.q.cuftFinished).toBe(96);
    expect(r.perBed?.bags).toBe(24);
  });
  it("lawn area: 1,000 sq ft at 4 in = 12.35 yd³ before settling; topsoil ≈ 1.1 t/yd³", () => {
    const r = soil({ shape: "sqft", a1: 1000, d: 4, settle: 0 });
    expect(r.q.cuydOrder).toBeCloseTo(12.35, 2);
    expect(r.tons).toBeCloseTo(13.58, 2);
    expect(r.truck.truck).toBe("tandem");
  });
  it("blend bag price is half topsoil, half compost per cu ft (estimate)", () => {
    const p = soilBagPrice("blend", 1.5);
    expect(p.estimated).toBe(true);
    expect(p.price).toBeCloseTo(((2.85 + 9.95 / 1.5) / 2) * 1.5, 2);
  });
  it("fill dirt in raised beds is flagged", () => {
    expect(soil({ ...soilMode("beds"), mat: "fill" }).warnings.some((w) => w.includes("Fill dirt"))).toBe(true);
  });
});

describe("sand", () => {
  it("a cubic yard is 54 bags of 50 lb (0.5 cu ft) and about 1.4 tons", () => {
    const r = sand({ shape: "vol", vol: 1, vu: "yd" });
    expect(r.bags).toBe(54);
    expect(r.tons).toBeCloseTo(1.4, 6);
    expect(r.bagsByOption.find((b) => b.id === "60")?.bags).toBe(45); // Sakrete TDS: 60 lb ≈ 0.6 cu ft
    expect(r.bagsPerTon).toBe(40);
  });
  it("a ton of sand is about 0.71 yd³", () => {
    expect(sand({ shape: "vol", vol: 1, vu: "ton" }).q.cuydOrder).toBeCloseTo(0.714, 3);
  });
  it("10×10 paver bed at 1 in = 8.33 cu ft → 17 bags of 0.5 cu ft, no extra", () => {
    const r = sand({ ...sandPatch("leveling"), l1: 10, w1: 10, d: 1, extra: 0, bag: "c05" });
    expect(r.bags).toBe(17);
  });
  it("bulk priced per yard or per ton", () => {
    const perYd = sand({ ...sandPatch("allpurpose"), shape: "vol", vol: 2 });
    expect(perYd.buy.bulkMaterial).toBeCloseTo(2 * 68.95, 6);
    const perTon = sand({ ...sandPatch("mason"), shape: "vol", vol: 2 });
    expect(perTon.buy.bulkMaterial).toBeCloseTo(2 * 1.4 * 69.95, 6);
  });
});

describe("paver base", () => {
  it("County Materials check: 6×10 at 4 in = 40 half-cubic-foot bags before compaction", () => {
    const r = paver({ l1: 6, w1: 10, bd: 4, cf: 1, ext: 0, extra: 0 });
    expect(r.base.bags).toBe(40);
  });
  it("10×10 patio: 6 in compacted base → 1.85 yd³ in place; 1 in bedding → 17 bags (research worked example)", () => {
    const r = paver({ l1: 10, w1: 10, ext: 0, extra: 0 });
    expect(r.base.q.cuydFinished).toBeCloseTo(1.85, 2);
    expect(r.base.q.cuydOrder).toBeCloseTo(2.46, 2);
    expect(r.bedding.bags).toBe(17);
    expect(r.base.lifts).toBe(2);
  });
  it("base extends past the edges and edge restraint skips walls", () => {
    const r = paver({ l1: 12, w1: 12, ext: 6, wall: 12 });
    expect(r.baseAreaSqFt).toBe(169);
    expect(r.perimeterFt).toBe(48);
    expect(r.edgeFt).toBe(36);
    expect(r.excavation.depthIn).toBeCloseTo(6 + 1 + 2.375, 6);
  });
  it("square-foot entries estimate edges as a square", () => {
    const r = paver({ shape: "sqft", a1: 144, ext: 0 });
    expect(r.approxEdges).toBe(true);
    expect(r.perimeterFt).toBe(48);
  });
  it("clear stone base is not compacted by volume and beds in chip stone", () => {
    const r = paver({ ...basePatch("clear"), l1: 10, w1: 10, ext: 0, extra: 0 });
    expect(r.base.factor).toBe(1);
    expect(r.bedding.cost).toBeUndefined();
  });
  it("thin driveway base is flagged against Unilock's 10–14 in", () => {
    const r = paver({ use: "driveway", bd: 6 });
    expect(r.warnings.some((w) => w.includes("10–14"))).toBe(true);
  });
});
