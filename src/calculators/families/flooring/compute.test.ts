import { describe, expect, it } from "vitest";
import {
  acclimationFor,
  autoWaste,
  bestCarpetLayout,
  boxesFor,
  carpetLayout,
  carpetStairs,
  compareProducts,
  computeBaseboard,
  computeCarpet,
  computeFlooring,
  expansionGapIn,
  inchFraction,
  layoutWastePct,
  packSticks,
  paintPlan,
  rectArea,
  rectPerimeter,
  resolveProduct,
  rollsFor,
  stickPieces,
  transitionPieces,
  wallSegments,
} from "./compute";
import { BASEBOARD_DEFAULTS, baseboardInputFrom } from "./baseboard-model";
import { CARPET_DEFAULTS, carpetInputFrom } from "./carpet-model";
import { FLOORING_DEFAULTS, flooringInputFrom } from "./flooring-model";
import { ACCESSORIES, BASEBOARD, CARPET, PRODUCTS, TRANSITIONS } from "./data";

const floor = (over: Partial<typeof FLOORING_DEFAULTS>) => computeFlooring(flooringInputFrom({ ...FLOORING_DEFAULTS, ...over }));
const carpet = (over: Partial<typeof CARPET_DEFAULTS>) => computeCarpet(carpetInputFrom({ ...CARPET_DEFAULTS, ...over }));
const base = (over: Partial<typeof BASEBOARD_DEFAULTS>) => computeBaseboard(baseboardInputFrom({ ...BASEBOARD_DEFAULTS, ...over }));
const sqftPerBox = (id: string) => PRODUCTS.find((p) => p.id === id)!.sqftPerBox;

describe("geometry", () => {
  it("ignores empty rectangles", () => {
    expect(rectArea({ l: 12, w: 14 })).toBe(168);
    expect(rectArea({ l: 0, w: 14 })).toBe(0);
    expect(rectPerimeter({ l: 10, w: 12 })).toBe(44);
    expect(rectPerimeter({ l: 10, w: 0 })).toBe(0);
  });
  it("formats gap fractions", () => {
    expect(inchFraction(0.375)).toBe("3/8 in");
    expect(inchFraction(0.75)).toBe("3/4 in");
  });
});

describe("boxes from verified carton sizes (research worked examples)", () => {
  it("12×12 room at 10%: 8 LifeProof, 7 NuCore Cedar Point, 9 Pergo Outlast+", () => {
    const order = 144 * 1.1;
    expect(boxesFor(order, sqftPerBox("lifeproof-87x48"))).toBe(8);
    expect(boxesFor(order, sqftPerBox("nucore-cedar-point"))).toBe(7);
    expect(boxesFor(order, sqftPerBox("pergo-outlast-748x4724"))).toBe(9);
  });
  it("1,000 sq ft: 55 LifeProof, 47 NuCore at 10%; 48 Bruce 22 sq ft cartons at 5%", () => {
    expect(boxesFor(1100, sqftPerBox("lifeproof-87x48"))).toBe(55);
    expect(boxesFor(1100, sqftPerBox("nucore-cedar-point"))).toBe(47);
    expect(boxesFor(1050, sqftPerBox("bruce-solid-325"))).toBe(48);
  });
  it("NuCore boxes of the same nominal size differ (19.02 vs 23.66 sq ft)", () => {
    expect(boxesFor(158.4, sqftPerBox("nucore-everwood-falls"))).toBe(9);
    expect(boxesFor(158.4, sqftPerBox("nucore-cedar-point"))).toBe(7);
  });
  it("zero area or zero box size gives zero boxes", () => {
    expect(boxesFor(0, 20)).toBe(0);
    expect(boxesFor(100, 0)).toBe(0);
  });
});

describe("waste by layout (LifeProof, Pergo, Bruce)", () => {
  it("vinyl/laminate: 10 straight, 15 diagonal, herringbone 20 under 200 sq ft else 15", () => {
    expect(autoWaste("lvp", "straight", 144, "simple").total).toBe(10);
    expect(autoWaste("laminate", "diagonal", 144, "simple").total).toBe(15);
    expect(autoWaste("lvp", "herringbone", 150, "simple").total).toBe(20);
    expect(autoWaste("lvp", "herringbone", 300, "simple").total).toBe(15);
  });
  it("hardwood: 5 straight, 10 diagonal (Bruce)", () => {
    expect(autoWaste("solid", "straight", 500, "simple").total).toBe(5);
    expect(autoWaste("engineered", "diagonal", 500, "simple").total).toBe(10);
  });
  it("layoutWastePct switches herringbone at 200 sq ft", () => {
    expect(layoutWastePct("laminate", "herringbone", 199)).toBe(20);
    expect(layoutWastePct("solid", "herringbone", 200)).toBe(15);
    expect(layoutWastePct("engineered", "straight", 50)).toBe(5);
  });
  it("adds small-job and complexity adders", () => {
    const w = autoWaste("lvp", "straight", 80, "complex");
    expect(w).toEqual({ layout: 10, complexity: 5, smallJob: 5, total: 20 });
    expect(autoWaste("lvp", "straight", 100, "average").total).toBe(13);
  });
});

describe("accessories", () => {
  it("transition sticks: a 94 in stick covers two 32–36 in doorways", () => {
    expect(transitionPieces(1, 32, 94)).toBe(1);
    expect(transitionPieces(2, 36, 94)).toBe(1);
    expect(transitionPieces(3, 32, 94)).toBe(2);
    expect(transitionPieces(2, 36, 78)).toBe(1);
    expect(transitionPieces(1, 120, 94)).toBe(2);
    expect(transitionPieces(0, 32, 94)).toBe(0);
  });
  it("trim sticks include a 10% miter allowance", () => {
    expect(stickPieces(45.33, 94, 10)).toBe(7);
    expect(stickPieces(40, 96, 10)).toBe(6);
    expect(stickPieces(0, 96, 10)).toBe(0);
  });
  it("underlayment and poly rolls (8 in overlaps on a 31.5 in roll)", () => {
    expect(rollsFor(144, 100)).toBe(2);
    expect(rollsFor(90, 100)).toBe(1);
    expect(rollsFor(144, 200, 8, 31.5)).toBe(1);
    expect(rollsFor(500, 200, 8, 31.5)).toBe(4);
    expect(rollsFor(0, 100)).toBe(0);
  });
  it("expansion gaps follow each maker's guide", () => {
    const lp = resolveProduct("lifeproof-87x48", "lvp", { sqftPerBox: 0, pricePerSqft: 0, attachedPad: true });
    const ct = resolveProduct("coretec-originals-7x72", "lvp", { sqftPerBox: 0, pricePerSqft: 0, attachedPad: true });
    expect(expansionGapIn(lp, 3000)).toBe(0.25);
    expect(expansionGapIn(ct, 2499)).toBe(0.25);
    expect(expansionGapIn(ct, 2500)).toBe(0.5);
    expect(expansionGapIn({ type: "laminate", install: "floating", rules: "pergo" }, 100)).toBe(0.375);
    expect(expansionGapIn({ type: "solid", install: "nail", rules: "bruce" }, 100)).toBe(0.75);
    expect(expansionGapIn({ type: "engineered", install: "floating", rules: "generic" }, 100)).toBe(0.5);
    expect(expansionGapIn({ type: "engineered", install: "nail", rules: "generic" }, 100)).toBe(0.25);
  });
});

describe("acclimation rules by maker", () => {
  it("LifeProof and COREtec need none, Pergo 48 h, hardwood by moisture content", () => {
    expect(acclimationFor({ type: "lvp", rules: "lifeproof" }).text).toMatch(/^Not required/);
    expect(acclimationFor({ type: "lvp", rules: "coretec" }).text).toMatch(/55–85°F/);
    expect(acclimationFor({ type: "laminate", rules: "pergo" }).text).toMatch(/^48 hours/);
    expect(acclimationFor({ type: "solid", rules: "bruce" }).text).toMatch(/3% \(strip\) or 2% \(plank\)/);
    expect(acclimationFor({ type: "engineered", rules: "generic" }).source).toMatch(/hardwood default/);
    expect(acclimationFor({ type: "lvp", rules: "generic" }).text).toMatch(/carton/);
  });
});

describe("resolveProduct", () => {
  it("falls back to the type default when the product belongs to another type", () => {
    expect(resolveProduct("lifeproof-87x48", "laminate", { sqftPerBox: 0, pricePerSqft: 0, attachedPad: true }).id).toBe("pergo-outlast-748x4724");
  });
  it("prices unpriced SKUs at the type's typical $/sq ft and flags them", () => {
    const r = resolveProduct("lifeproof-herringbone", "lvp", { sqftPerBox: 0, pricePerSqft: 0, attachedPad: true });
    expect(r.priced).toBe(false);
    expect(r.boxPrice).toBeCloseTo(2.98 * 22.31, 2);
  });
  it("custom product uses the entered box size and price", () => {
    const r = resolveProduct("custom", "lvp", { sqftPerBox: 23.4, pricePerSqft: 2.5, attachedPad: false });
    expect(r.sqftPerBox).toBe(23.4);
    expect(r.boxPrice).toBeCloseTo(58.5, 6);
    expect(r.attachedPad).toBe(false);
  });
});

describe("computeFlooring", () => {
  it("12×12 LifeProof: 158.4 sq ft ordered, 8 boxes, no extra underlayment", () => {
    const r = floor({});
    expect(r.netSqft).toBe(144);
    expect(r.orderSqft).toBeCloseTo(158.4, 6);
    expect(r.boxes).toBe(8);
    expect(r.leftoverSqft).toBeCloseTo(8 * 20.06 - 158.4, 6);
    expect(r.underlayment.kind).toBe("attached");
    expect(r.underlayment.rolls).toBe(0);
    expect(r.gapIn).toBe(0.25);
    expect(r.transitions.pieces).toBe(1);
    expect(r.trim?.pieces).toBe(7);
    expect(r.boxCost).toBeCloseTo(8 * 59.97, 2);
  });
  it("sums several areas and their perimeters", () => {
    const r = floor({ areas: 2, l1: 12, w1: 12, l2: 6, w2: 3 });
    expect(r.netSqft).toBe(162);
    expect(r.perimeterFt).toBe(48 + 18);
  });
  it("spare boxes add on top of the need", () => {
    const r = floor({ spare: 1 });
    expect(r.boxesNeeded).toBe(8);
    expect(r.boxes).toBe(9);
  });
  it("laminate on a slab gets the required 6 mil poly; LVP on grade does not", () => {
    const lam = floor({ type: "laminate", product: "pergo-outlast-748x4724", subfloor: "slab" });
    expect(lam.vapor?.required).toBe(true);
    expect(lam.vapor?.rolls).toBe(1);
    expect(lam.gapIn).toBe(0.375);
    expect(floor({ subfloor: "slab" }).vapor).toBeNull();
    expect(floor({ subfloor: "basement" }).vapor?.required).toBe(false);
  });
  it("unpadded laminate gets foam underlayment", () => {
    const r = floor({ type: "laminate", product: "trafficmaster-grey-oak" });
    expect(r.underlayment.kind).toBe("foam");
    expect(r.underlayment.rolls).toBe(2);
    expect(r.underlayment.cost).toBeCloseTo(2 * ACCESSORIES.foam.price, 6);
  });
  it("solid hardwood: 5% waste, felt, 78 in transitions, and a gap too wide for quarter round", () => {
    const r = floor({ type: "solid", product: "bruce-solid-325", l1: 20, w1: 20 });
    expect(r.wastePct).toBe(5);
    expect(r.boxes).toBe(20);
    expect(r.underlayment.kind).toBe("felt");
    expect(r.underlayment.rolls).toBe(1);
    expect(r.transitions.stickIn).toBe(TRANSITIONS.hardwood.lengthIn);
    expect(r.gapCovered).toBe(false);
    expect(r.warnings.some((w) => w.includes("3/4 in expansion gap"))).toBe(true);
    expect(floor({ type: "solid", product: "bruce-solid-325", subfloor: "slab" }).warnings.some((w) => w.includes("concrete"))).toBe(true);
  });
  it("warns about herringbone with standard LifeProof planks", () => {
    const r = floor({ layout: "herringbone" });
    expect(r.wastePct).toBe(20);
    expect(r.warnings.some((w) => w.includes("voids the warranty"))).toBe(true);
    expect(floor({ layout: "herringbone", product: "lifeproof-herringbone" }).warnings.some((w) => w.includes("voids"))).toBe(false);
  });
  it("hand-entered waste below the layout rule triggers a warning", () => {
    const r = floor({ wasteAuto: false, waste: 5 });
    expect(r.wastePct).toBe(5);
    expect(r.boxes).toBe(boxesFor(144 * 1.05, 20.06));
    expect(r.warnings.some((w) => w.includes("below the 10%"))).toBe(true);
  });
  it("Pergo T-molding triggers: narrow doorways and rooms of 50 ft", () => {
    const r = floor({ type: "laminate", product: "pergo-outlast-748x4724", doorW: 30, l1: 52, w1: 14 });
    expect(r.warnings.some((w) => w.includes("narrower than 32 in"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("50 ft"))).toBe(true);
  });
  it("area mode works without room dimensions", () => {
    const r = floor({ mode: "area", sqft: 1000 });
    expect(r.netSqft).toBe(1000);
    expect(r.boxes).toBe(55);
    expect(r.trim).toBeNull();
    expect(r.rows).toBeUndefined();
  });
  it("stairs: planks + 94 in stair noses, or LifeProof matching treads", () => {
    const nu = floor({ product: "nucore-cedar-point", steps: 13 });
    expect(nu.stairs?.plankSqft).toBeCloseTo(((13 * 17.5 * 36) / 144) * 1.2, 6);
    expect(nu.stairs?.noseSticks).toBe(7);
    expect(nu.boxes).toBe(boxesFor(158.4 + nu.stairs!.plankSqft, 23.66));
    const lp = floor({ steps: 13 });
    expect(lp.stairs?.treadBoxes).toBe(7);
    expect(lp.stairs?.plankSqft).toBe(0);
  });
  it("rows across the room account for the gap at both walls", () => {
    const r = floor({});
    expect(r.rows?.count).toBe(17);
    expect(r.rows?.lastRowIn).toBeCloseTo(143.5 - 16 * 8.7, 6);
  });
  it("zero size returns zeros, not NaN", () => {
    const r = floor({ l1: 0 });
    expect(r.boxes).toBe(0);
    expect(r.effectivePsf).toBe(0);
    expect(r.materialsCost).toBe(r.transitions.cost);
  });
  it("labor and removal scale with the net floor area", () => {
    const r = floor({ labor: 3.5, removal: true });
    expect(r.laborCost).toBeCloseTo(504, 6);
    expect(r.removalCost).toBeCloseTo(216, 6);
  });
  it("compares every product of a type for the same order", () => {
    const rows = compareProducts("lvp", 158.4, false);
    expect(rows.find((x) => x.product.id === "nucore-cedar-point")?.boxes).toBe(7);
    expect(rows.every((x) => !x.product.pattern)).toBe(true);
  });
});

describe("carpet roll layout (Shaw roll widths, CRI 105 pile direction)", () => {
  it("12×14 on a 12 ft roll: one drop, 174 sq ft = 19.3 sq yd, no seam", () => {
    const r = bestCarpetLayout(14, 12, 12, 3);
    expect(r.drops).toBe(1);
    expect(r.sqft).toBeCloseTo(174, 6);
    expect(r.sqyd).toBeCloseTo(19.333, 3);
    expect(r.seams).toBe(0);
  });
  it("13×15: 324 sq ft on 12 ft rolls vs 202.5 on a 15 ft roll", () => {
    expect(bestCarpetLayout(15, 13, 12, 3).sqft).toBeCloseTo(324, 6);
    expect(carpetLayout(15, 13, 12, "length", 3).sqft).toBeCloseTo(372, 6);
    expect(bestCarpetLayout(15, 13, 15, 3).sqft).toBeCloseTo(202.5, 6);
  });
  it("ties go to the layout with seams along the long way", () => {
    const r = bestCarpetLayout(20, 20, 12, 3);
    expect(r.seams).toBe(1);
    expect(r.runAlong).toBe("length");
  });
  it("13 straight steps, 36 in wide: 3 across, 5 rows, 8.125 linear ft = 97.5 sq ft", () => {
    const s = carpetStairs(13, 36, 10, 7.5, 12);
    expect(s.across).toBe(3);
    expect(s.rows).toBe(5);
    expect(s.linearFt).toBeCloseTo(8.125, 6);
    expect(s.sqft).toBeCloseTo(97.5, 6);
    // Fixr: ~4.5 sq ft of carpet per straight step, net
    expect(s.netSqft / 13).toBeCloseTo(CARPET.netSqftPerStep, 0);
  });
  it("computeCarpet: tack strip skips doorways, pad gets 5%", () => {
    const r = carpet({});
    expect(r.orderSqft).toBeCloseTo(174, 6);
    expect(r.tackStripLf).toBeCloseTo(52 - 32 / 12, 6);
    expect(r.padSqft).toBeCloseTo(168 * 1.05, 6);
    expect(r.carpetCost).toBeCloseTo(174 * CARPET.pricePerSqft, 6);
  });
  it("walls over 30 ft get a second row of tack strip", () => {
    const r = carpet({ l: 32, w: 12 });
    expect(r.doubledTackLf).toBe(64);
    expect(r.warnings.some((w) => w.includes("30 ft"))).toBe(true);
  });
  it("stairs mode ignores the room; both mode adds them", () => {
    const st = carpet({ mode: "stairs" });
    expect(st.layout).toBeNull();
    expect(st.orderSqft).toBeCloseTo(97.5, 6);
    expect(st.laborCost).toBeCloseTo(13 * CARPET.stairLaborPerStep, 6);
    const both = carpet({ mode: "both" });
    expect(both.orderSqft).toBeCloseTo(174 + 97.5, 6);
  });
  it("zero room gives zero order", () => {
    const r = carpet({ l: 0 });
    expect(r.orderSqft).toBe(0);
    expect(r.wastePct).toBe(0);
  });
  it("flags a room exactly as wide as the roll", () => {
    expect(carpet({ l: 15, w: 12 }).warnings.some((w) => w.includes("almost no edge"))).toBe(true);
  });
});

describe("baseboard", () => {
  it("12×12 with one 36 in door: 45 linear ft (worked paint-research example)", () => {
    const r = base({});
    expect(r.netLf).toBeCloseTo(45, 6);
    expect(r.pieces).toBe(5);
    expect(r.insideCorners).toBe(4);
    expect(r.nails).toBe(68);
    expect(r.caulkTubes).toBe(1);
    expect(r.quarts).toBe(1);
    expect(r.gallons).toBe(0);
  });
  it("8 ft sticks need splices on 12 ft walls", () => {
    const r = base({ stock: 8 });
    expect(r.plan.splices).toBe(4);
    expect(r.pieces).toBe(7);
    expect(r.warnings.some((w) => w.includes("scarf"))).toBe(true);
    const o = r.options.find((x) => x.stockFt === 16)!;
    expect(o.splices).toBe(0);
  });
  it("wall segments subtract openings from the longest walls", () => {
    expect(wallSegments([{ l: 14, w: 10 }], 0, [3]).sort((a, b) => a - b)).toEqual([10, 10, 11, 14]);
    expect(wallSegments([{ l: 10, w: 10 }], 4, [])).toHaveLength(5);
  });
  it("packs offcuts first-fit so short walls share sticks", () => {
    const plan = packSticks([12, 12, 4, 4, 4], 16);
    expect(plan.sticks).toHaveLength(3);
    expect(plan.splices).toBe(0);
  });
  it("DAP: one 10.1 oz tube per 55 linear ft", () => {
    expect(base({ l1: 15, w1: 15, doors: 1, doorW: 60 }).caulkTubes).toBe(1);
    expect(base({ l1: 20, w1: 20, doors: 0 }).caulkTubes).toBe(2);
    expect(BASEBOARD.caulkLfPerTube).toBe(55);
  });
  it("paint buys a gallon once 3 quarts would cost more", () => {
    expect(paintPlan(0.4)).toEqual({ gallons: 0, quarts: 2, cost: 2 * BASEBOARD.quartPrice });
    expect(paintPlan(0.7).gallons).toBe(1);
    expect(paintPlan(0)).toEqual({ gallons: 0, quarts: 0, cost: 0 });
  });
  it("outside corners add an inside corner each; skip and quarter round options", () => {
    const r = base({ outside: 2, skip: 10, qr: true });
    expect(r.insideCorners).toBe(6);
    expect(r.outsideCorners).toBe(2);
    expect(r.netLf).toBeCloseTo(35, 6);
    expect(r.qrPieces).toBe(5);
  });
  it("empty input gives zeros", () => {
    const r = base({ l1: 0, doors: 0 });
    expect(r.netLf).toBe(0);
    expect(r.pieces).toBe(0);
    expect(r.insideCorners).toBe(0);
  });
});
