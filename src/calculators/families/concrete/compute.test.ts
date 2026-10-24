import { describe, expect, it } from "vitest";
import {
  bagOptions,
  bagsFor,
  chairHeightIn,
  circleArea,
  computeColumns,
  computeFooting,
  computePostHoles,
  computeSlab,
  computeSteps,
  concreteOrder,
  DEFAULT_FEES,
  formLumberFor,
  gravelBaseFor,
  orderWarnings,
  postAreaSqIn,
  postHoleCuft,
  quikreteCalcBags,
  readyMixCost,
  readyMixOrderYd,
  stairCrossSectionSqIn,
  stepsForRise,
  tubeCuftPerFt,
} from "./compute";
import { BAG_YIELD_CUFT, CONCRETE_SOURCES, QUIKRETE_CALC_DEPTHS, QUIKRETE_CALC_PAIRS, QUIKTUBE_TABLE, SAKRETE_POST_TABLE, SONOCO_4FT } from "./data";
import { COLUMN_DEFAULTS, columnInputFrom } from "./column-model";
import { FOOTING_DEFAULTS, footingInputFrom } from "./footing-model";
import { POST_DEFAULTS, postInputFrom } from "./post-model";
import { SLAB_DEFAULTS, slabInputFrom } from "./slab-model";
import { STEPS_DEFAULTS, stepsInputFrom } from "./steps-model";
import { calculators } from "./index";

const slab = (over: Partial<typeof SLAB_DEFAULTS>) => computeSlab(slabInputFrom({ ...SLAB_DEFAULTS, ...over }));
const posts = (over: Partial<typeof POST_DEFAULTS>) => computePostHoles(postInputFrom({ ...POST_DEFAULTS, ...over }));
const footing = (over: Partial<typeof FOOTING_DEFAULTS>) => computeFooting(footingInputFrom({ ...FOOTING_DEFAULTS, ...over }));
const columns = (over: Partial<typeof COLUMN_DEFAULTS>) => computeColumns(columnInputFrom({ ...COLUMN_DEFAULTS, ...over }));
const steps = (over: Partial<typeof STEPS_DEFAULTS>) => computeSteps(stepsInputFrom({ ...STEPS_DEFAULTS, ...over }));

describe("bag yields (Quikrete/Sakrete TDS)", () => {
  it("45 × 80-lb bags per cubic yard, no waste", () => {
    expect(bagsFor(27, 80, 0)).toBe(45);
    expect(bagsFor(27, 60, 0)).toBe(60);
    expect(bagsFor(27, 40, 0)).toBe(90);
    expect(bagsFor(27, 50, 0)).toBe(72);
  });
  it("guards float noise on exact multiples (48 × 1.1 / 0.6 is 88, not 89)", () => {
    expect(bagsFor(48, 80, 10)).toBe(88);
    expect(bagsFor(192, 80, 10)).toBe(352);
  });
  it("zero and negative volumes need no bags", () => {
    expect(bagsFor(0, 80, 10)).toBe(0);
    expect(concreteOrder(-5, { productId: "standard", bagSize: 80, wastePct: 10 }).bags).toBe(0);
  });
});

describe("slab volumes match the published quick table", () => {
  it("10×10×4: 1.23 yd³, 56 bags net, 62 with 10%", () => {
    const r = slab({ l1: 10, w1: 10, t: 4, waste: 0 });
    expect(r.cuydNet).toBeCloseTo(1.2346, 3);
    expect(r.bags).toBe(56);
    expect(slab({ l1: 10, w1: 10, t: 4, waste: 10 }).bags).toBe(62);
  });
  it("12×12×4 → 80 net / 88 with 10%; 24×24×4 → 352 with 10%", () => {
    expect(slab({ l1: 12, w1: 12, t: 4, waste: 0 }).bags).toBe(80);
    expect(slab({ l1: 12, w1: 12, t: 4, waste: 10 }).bags).toBe(88);
    expect(slab({ l1: 24, w1: 24, t: 4, waste: 10 }).bags).toBe(352);
  });
  it("20×20×4 → 223 net 80-lb bags, 297 × 60-lb", () => {
    const r = slab({ l1: 20, w1: 20, t: 4, waste: 0 });
    expect(r.bags).toBe(223);
    expect(r.bagsBySize.find((b) => b.size === 60)?.bags).toBe(297);
  });
  it("L-shape sums sections; circle uses πr²", () => {
    const l = slab({ l1: 10, w1: 10, sections: 2, l2: 6, w2: 4, t: 4, waste: 0 });
    expect(l.areaSqFt).toBe(124);
    const c = slab({ shape: "circle", l1: 10, t: 4, waste: 0 });
    expect(c.areaSqFt).toBeCloseTo(78.54, 2);
  });
  it("identical pads multiply", () => {
    expect(slab({ l1: 2, w1: 2, t: 4, count: 4, waste: 0 }).areaSqFt).toBe(16);
  });
  it("rebar chairs follow slab thickness", () => {
    expect(slab({ rebar: "patio", t: 4 }).rebarPlan?.chairIn).toBe(2);
    expect(slab({ rebar: "driveway", t: 6 }).rebarPlan?.chairIn).toBe(3);
  });
});

describe("ready-mix ordering", () => {
  it("rounds up to quarter yards with a 1 yd minimum", () => {
    expect(readyMixOrderYd(0.3)).toBe(1);
    expect(readyMixOrderYd(1.36)).toBe(1.5);
    expect(readyMixOrderYd(4.01)).toBe(4.25);
  });
  it("adds short-load fee only under the threshold", () => {
    const small = readyMixCost(2, DEFAULT_FEES);
    const big = readyMixCost(5, DEFAULT_FEES);
    expect(small).toBe(2 * DEFAULT_FEES.pricePerYd + DEFAULT_FEES.shortLoadFee + DEFAULT_FEES.deliveryFee + DEFAULT_FEES.fuelFee);
    expect(big).toBe(5 * DEFAULT_FEES.pricePerYd + DEFAULT_FEES.deliveryFee + DEFAULT_FEES.fuelFee);
  });
  it("bulk pallet price applies at 42+ bags", () => {
    const r = slab({ l1: 10, w1: 10, t: 4, waste: 10 });
    expect(r.bagCost).toBeCloseTo(62 * 5.93, 2);
  });
  it("finds a break-even volume and calls the truck cheaper for big pours", () => {
    const o = concreteOrder(27 * 4, { productId: "standard", bagSize: 80, wastePct: 10 });
    expect(o.breakEvenYd).toBeGreaterThan(0);
    expect(o.breakEvenYd!).toBeLessThan(4);
    expect(o.cheaper).toBe("ready-mix");
  });
});

describe("shared helpers", () => {
  it("chair height keeps bars between mid-depth and the upper third (IRC R506.2.4)", () => {
    expect(chairHeightIn(3.5, 0.375)).toBe(2);
    expect(chairHeightIn(4, 0.375)).toBe(2);
    expect(chairHeightIn(5, 0.5)).toBe(2.5);
    expect(chairHeightIn(6, 0.5)).toBe(3);
  });
  it("picks form boards by their real height", () => {
    expect(formLumberFor(3.5)).toBe("2×4");
    expect(formLumberFor(4)).toBe("2×6");
    expect(formLumberFor(7)).toBe("2×8");
    expect(formLumberFor(8)).toBe("2×10");
    expect(formLumberFor(12)).toBe("2 rows of 2×12");
  });
});

describe("post holes", () => {
  it("reproduces Quikrete's online calculator table (round posts, 50 lb Fast-Setting)", () => {
    const published: Record<number, number[]> = { 2: [1, 2, 2, 2, 2], 3: [3, 3, 4, 4, 5], 4: [4, 5, 6, 7, 8], 6: [9, 11, 13, 15, 17] };
    for (const [post, hole] of QUIKRETE_CALC_PAIRS) {
      expect(QUIKRETE_CALC_DEPTHS.map((d) => quikreteCalcBags(post, hole, d))).toEqual(published[post]);
    }
  });
  it("matches the square-lumber table: hole area minus post, full depth", () => {
    const bags = (post: number, hole: number, depth: number, size: 50 | 80) => Math.ceil(postHoleCuft(hole, post * post, depth) / BAG_YIELD_CUFT[size] - 1e-9);
    expect([24, 30, 36, 42].map((d) => bags(3.5, 10, d, 50))).toEqual([3, 4, 4, 5]);
    expect([24, 30, 36, 42].map((d) => bags(3.5, 10, d, 80))).toEqual([2, 2, 3, 3]);
    expect([24, 30, 36, 42].map((d) => bags(3.5, 12, d, 50))).toEqual([4, 5, 6, 7]);
    expect([36, 42, 48].map((d) => bags(5.5, 16, d, 50))).toEqual([10, 12, 13]);
    expect([36, 42, 48].map((d) => bags(5.5, 18, d, 80))).toEqual([8, 10, 11]);
  });
  it("lands within a quarter bag of Sakrete's 10 in hole table for a 4×4", () => {
    for (const [depth, sakrete] of SAKRETE_POST_TABLE.rows) {
      const ours = postHoleCuft(SAKRETE_POST_TABLE.holeIn, 3.5 * 3.5, depth) / SAKRETE_POST_TABLE.yieldCuft;
      expect(Math.abs(ours - sakrete)).toBeLessThan(0.25);
    }
  });
  it("shows Quikrete's '2 bags for a 3 in post' claim under-supplies (geometry: 2.53 bags)", () => {
    const cuft = postHoleCuft(9, 3 * 3, 30);
    expect(cuft / BAG_YIELD_CUFT[50]).toBeCloseTo(2.53, 2);
  });
  it("defaults: 6 ft 4×4 fence post → 36 in buried, 10.5 in hole, 6 in gravel, 3 in soil cap", () => {
    const r = posts({});
    expect(r.holeDiaIn).toBeCloseTo(10.5, 6);
    expect(r.holeDepthIn).toBe(42);
    expect(r.concreteDepthIn).toBe(33);
    expect(r.cuftPerPost).toBeCloseTo(((Math.PI * 5.25 ** 2 - 12.25) * 33) / 1728, 6);
    expect(r.bagsPerPost).toBeCloseTo(3.79, 2);
    expect(r.order.bags).toBe(5);
    expect(r.lifts).toBe(2);
    expect(r.gravelBags).toBe(1);
    expect(r.waterGal[0]).toBe(5);
  });
  it("rounds the whole job, not each hole", () => {
    const r = posts({ count: 20 });
    expect(r.order.bags).toBe(Math.ceil(r.bagsPerPost * 20 * 1.1));
    expect(r.order.bags).toBeLessThan(r.bagsPerHoleRounded * 20);
  });
  it("dry-mix base adds a full-width plug; no base leaves the post on soil", () => {
    const gravel = posts({ base: "gravel" });
    const dry = posts({ base: "drymix" });
    const none = posts({ base: "none" });
    expect(dry.cuftPerPost - gravel.cuftPerPost).toBeCloseTo((Math.PI * 5.25 ** 2 * 6) / 1728, 6);
    expect(none.holeDepthIn).toBe(36);
    expect(none.gravelCuft).toBe(0);
  });
  it("6×6 posts get a 16.5 in hole; round posts use the diameter", () => {
    expect(posts({ post: "6x6" }).holeDiaIn).toBeCloseTo(16.5, 6);
    expect(posts({ post: "round", dia: 4 }).holeDiaIn).toBe(12);
  });
  it("Concrete Mix is mixed, not dry-poured, and uses its own water range", () => {
    const r = posts({ product: "standard", bag: 80 });
    expect(r.dryPour).toBe(false);
    expect(r.waterGal[1]).toBeGreaterThan(r.waterGal[0]);
  });
  it("warns about shallow posts, narrow holes and an over-deep cap", () => {
    expect(posts({ embed: 18 }).warnings.some((w) => w.includes("third"))).toBe(true);
    expect(posts({ hole: 8 }).warnings.some((w) => w.includes("3×"))).toBe(true);
    expect(posts({ embed: 3, cap: 3 }).warnings.some((w) => w.includes("nothing left"))).toBe(true);
  });
});

describe("footings", () => {
  it("40 ft of 16 × 8 in footing = 35.6 cu ft, 66 × 80-lb bags with 10%", () => {
    const r = footing({ type: "wall", len: 40, w: 16, t: 8, waste: 10 });
    expect(r.order.cuftNet).toBeCloseTo(35.556, 3);
    expect(r.order.bags).toBe(66);
    expect(r.rebar?.sticks).toBe(5);
    expect(r.projectionIn).toBe(4);
  });
  it("IRC minimum 12 × 6: 0.5 cu ft per foot; smaller footings warn", () => {
    expect(footing({ w: 12, t: 6 }).cuftPerUnit).toBeCloseTo(0.5, 6);
    expect(footing({ w: 10, t: 6 }).warnings.some((w) => w.includes("R403.1.1"))).toBe(true);
  });
  it("checks footing projection against the wall", () => {
    expect(footing({ w: 10, wall: 8, t: 8 }).warnings.some((w) => w.includes("at least 2 in"))).toBe(true);
    expect(footing({ w: 30, wall: 8, t: 6 }).warnings.some((w) => w.includes("projection"))).toBe(true);
  });
  it("pads: 6 × 24×24×12 in = 24 cu ft", () => {
    const r = footing({ type: "pad", pads: 6, pl: 24, pw: 24, pt: 12, waste: 0 });
    expect(r.order.cuftNet).toBeCloseTo(24, 6);
    expect(r.order.bags).toBe(40);
    expect(r.rebar).toBeUndefined();
  });
  it("formed footings list both sides of form board", () => {
    const r = footing({ type: "wall", len: 20, t: 8, forms: true });
    expect(r.forms?.linearFt).toBe(40);
    expect(r.forms?.lumber).toBe("2×10");
  });
});

describe("round columns", () => {
  it("reproduces Quik-Tube Table 1 for 1–4 ft of every listed diameter", () => {
    for (const [dia, table] of Object.entries(QUIKTUBE_TABLE)) {
      for (let ft = 1; ft <= 4; ft++) {
        const cuft = tubeCuftPerFt(Number(dia)) * ft;
        expect(Math.ceil(cuft / BAG_YIELD_CUFT[60] - 1e-9)).toBe(table[60][ft - 1]);
        expect(Math.ceil(cuft / BAG_YIELD_CUFT[80] - 1e-9)).toBe(table[80][ft - 1]);
      }
    }
  });
  it("matches Sonoco's 4 ft table except the 12 in tube, which Sonoco rounds up to 8 × 60 lb", () => {
    for (const [dia, t] of Object.entries(SONOCO_4FT)) {
      const cuft = tubeCuftPerFt(Number(dia)) * 4;
      expect(Math.ceil(cuft / 0.6 - 1e-9)).toBe(t[80]);
      if (dia !== "12") expect(Math.ceil(cuft / 0.45 - 1e-9)).toBe(t[60]);
    }
    expect(Math.ceil((tubeCuftPerFt(12) * 4) / 0.45)).toBe(7);
  });
  it("12 in × 4 ft = 3.14 cu ft = 6 × 80-lb bags, table attached", () => {
    const r = columns({ dia: 12, len: 4, count: 1, waste: 0 });
    expect(r.tubeCuft).toBeCloseTo(3.1416, 3);
    expect(r.order.bags).toBe(6);
    expect(r.quikTube).toEqual({ 60: 7, 80: 6 });
    expect(r.sonoco).toEqual({ 60: 8, 80: 6 });
  });
  it("adds a footing 2× the tube diameter under each tube", () => {
    const r = columns({ dia: 10, len: 4, ftg: 6, fdia: 0 });
    expect(r.footingDiaIn).toBe(20);
    expect(r.footingCuft).toBeCloseTo((Math.PI * 100 * 6) / 1728, 6);
  });
  it("buys stock tubes: three 2 ft piers come from two 4 ft tubes", () => {
    expect(columns({ len: 2, count: 3 }).tubes).toEqual({ lengthFt: 4, buy: 2, perTube: 2 });
    expect(columns({ len: 6, count: 3 }).tubes).toEqual({ lengthFt: 12, buy: 2, perTube: 2 });
  });
  it("warns on tall exposed tubes and shallow footings", () => {
    expect(columns({ above: 30 }).warnings.some((w) => w.includes("brace"))).toBe(true);
    expect(columns({ above: 40 }).warnings.some((w) => w.includes("3 ft above"))).toBe(true);
    expect(columns({ len: 1, above: 6, ftg: 0 }).warnings.some((w) => w.includes("12 in below"))).toBe(true);
  });
});

describe("steps", () => {
  it("matches calculator.net's stair check (R = D = W = 1 ft, 3 steps)", () => {
    expect(stairCrossSectionSqIn(3, 12, 12, "existing", 0) / 144).toBeCloseTo(3, 9);
    expect(stairCrossSectionSqIn(3, 12, 12, "landing", 12) / 144).toBeCloseTo(6, 9);
    expect(stairCrossSectionSqIn(3, 12, 12, "landing", 24) / 144).toBeCloseTo(9, 9);
  });
  it("3 steps, 7 in rise, 11 in tread, 4 ft wide with a 36 in landing = 27.4 cu ft", () => {
    const r = steps({ mode: "steps", n: 3, rise: 7, run: 11, width: 4, top: "landing", land: 36, waste: 10 });
    expect(r.order.cuftNet).toBeCloseTo(27.417, 3);
    expect(r.order.bags).toBe(51);
    expect(r.runLengthIn).toBe(58);
    expect(r.concreteHeightIn).toBe(21);
    expect(r.forms.risers).toBe(3);
    expect(r.forms.riserLumber).toBe("2×8");
  });
  it("solves riser count from total height", () => {
    expect(stepsForRise(21)).toEqual({ steps: 3, riseIn: 7 });
    expect(stepsForRise(24).steps).toBe(4);
    expect(stepsForRise(31)).toEqual({ steps: 4, riseIn: 7.75 });
    expect(stepsForRise(0).steps).toBe(0);
  });
  it("flags code issues: tall risers, short treads, handrails, guards, shallow landing", () => {
    const r = steps({ mode: "steps", n: 5, rise: 8, run: 10, top: "landing", land: 30 });
    expect(r.checks).toEqual({ riserOk: false, treadOk: true, nosingNeeded: true, handrail: true, guard: true, landingOk: false });
    expect(steps({ mode: "steps", n: 3, rise: 7, run: 11, top: "existing" }).checks.landingOk).toBeNull();
  });
  it("height mode drives the riser count", () => {
    const r = steps({ mode: "height", height: 28, top: "landing" });
    expect(r.totalRiseIn).toBeCloseTo(28, 9);
    expect(r.forms.risers).toBe(4);
  });
});

describe("edge cases and shared pieces", () => {
  it("geometry helpers", () => {
    expect(circleArea(12)).toBeCloseTo(113.097, 3);
    expect(circleArea(0)).toBe(0);
    expect(postAreaSqIn("rect", 3.5, 5.5)).toBeCloseTo(19.25, 9);
    expect(postAreaSqIn("round", 4, 0)).toBeCloseTo(12.566, 3);
  });
  it("bag options price every size the product comes in", () => {
    const opts = bagOptions("standard", 27, 0);
    expect(opts.map((o) => o.size)).toEqual([40, 50, 60, 80]);
    expect(opts.find((o) => o.size === 80)?.cost).toBeCloseTo(45 * 5.93, 2);
    expect(opts.find((o) => o.size === 40)?.cost).toBeUndefined();
  });
  it("gravel base: 100 sq ft at 4 in compacted, 1.3 loose factor", () => {
    const g = gravelBaseFor(100);
    expect(g.cuydCompacted).toBeCloseTo(1.2346, 4);
    expect(g.cuydLoose).toBeCloseTo(1.2346 * 1.3, 3);
    expect(g.tons).toBeCloseTo(1.2346 * 1.3 * 1.45, 3);
  });
  it("fast-set batch warning only applies when the bags are mixed", () => {
    const o = concreteOrder(5, { productId: "fast", bagSize: 50, wastePct: 10 });
    expect(orderWarnings(o, "fast", true).some((w) => w.includes("20 minutes"))).toBe(true);
    expect(orderWarnings(o, "fast", false).some((w) => w.includes("20 minutes"))).toBe(false);
  });
  it("clamps zero or negative counts and sizes", () => {
    expect(posts({ count: 0 }).order.bags).toBe(posts({ count: 1 }).order.bags);
    expect(footing({ len: 0 }).order.bags).toBe(0);
    expect(footing({ len: 0 }).rebar).toBeUndefined();
    expect(columns({ len: 0 }).tubes.buy).toBe(0);
    const one = steps({ mode: "steps", n: 1, top: "existing" });
    expect(one.order.bags).toBe(0);
    expect(one.warnings.some((w) => w.includes("One step-up"))).toBe(true);
  });
  it("huge jobs: weight warning and the truck wins", () => {
    const fence = posts({ count: 500 });
    expect(fence.warnings.some((w) => w.includes("tons of bags"))).toBe(true);
    const wide = steps({ mode: "steps", n: 5, width: 40, top: "landing" });
    expect(wide.order.cheaper).toBe("ready-mix");
    expect(wide.forms.plywoodSheets).toBe(2 * Math.ceil(wide.runLengthIn / 96) * Math.ceil(wide.concreteHeightIn / 48));
  });
  it("tiny tube: a 6 in × 1 ft sleeve is one bag either size", () => {
    const r = columns({ dia: 6, len: 1, waste: 0 });
    expect(r.perColumn.find((x) => x.size === 80)?.whole).toBe(1);
    expect(r.quikTube).toEqual({ 60: 1, 80: 1 });
  });
});

describe("sources", () => {
  it("every family source is an https link with a check date, and each page cites only family sources", () => {
    for (const s of CONCRETE_SOURCES) {
      expect(s.url.startsWith("https://")).toBe(true);
      expect(s.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    for (const c of calculators) {
      expect(c.meta.sources.length).toBeGreaterThan(0);
      for (const s of c.meta.sources) expect(CONCRETE_SOURCES).toContain(s);
    }
  });
});
