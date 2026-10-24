import { describe, expect, it } from "vitest";
import {
  aPitch,
  autoWastePct,
  capNailsPerSqFt,
  computeMetal,
  computePitch,
  computeRoof,
  dripEdgePieces,
  hipFactor,
  iceBarrierCourses,
  iceWaterRolls,
  pickDumpster,
  pitchAngle,
  pitchClass,
  pitchFactor,
  riseFromAngle,
  roofFromFootprint,
  stockPlan,
  underlaymentRolls,
} from "./compute";
import { METAL_PROFILES, SHINGLES } from "./data";
import { METAL_DEFAULTS, metalInputFrom } from "./metal-model";
import { PITCH_DEFAULTS, pitchInputFrom } from "./pitch-model";
import { ROOFING_DEFAULTS, roofingInputFrom } from "./roofing-model";

const roof = (over: Partial<typeof ROOFING_DEFAULTS>) => computeRoof(roofingInputFrom({ ...ROOFING_DEFAULTS, ...over }));
const metal = (over: Partial<typeof METAL_DEFAULTS>) => computeMetal(metalInputFrom({ ...METAL_DEFAULTS, ...over }));
const pitch = (over: Partial<typeof PITCH_DEFAULTS>) => computePitch(pitchInputFrom({ ...PITCH_DEFAULTS, ...over }));

describe("pitch factors (CertainTeed SAM Tables 1–2)", () => {
  it("slope factors", () => {
    expect(pitchFactor(4)).toBeCloseTo(1.054, 3);
    expect(pitchFactor(6)).toBeCloseTo(1.118, 3);
    expect(pitchFactor(12)).toBeCloseTo(1.414, 3);
    expect(pitchFactor(0)).toBe(1);
  });
  it("hip/valley factors (SAM prints 1.524 for 7/12; the exact value is 1.530)", () => {
    expect(hipFactor(6)).toBeCloseTo(1.5, 3);
    expect(hipFactor(5)).toBeCloseTo(1.474, 3);
    expect(hipFactor(7)).toBeCloseTo(1.5298, 3);
  });
  it("angles and the inverse", () => {
    expect(pitchAngle(6)).toBeCloseTo(26.57, 2);
    expect(pitchAngle(12)).toBeCloseTo(45, 6);
    expect(riseFromAngle(33.69)).toBeCloseTo(8, 2);
    expect(riseFromAngle(95)).toBeGreaterThan(1000);
  });
  it("reads pitches with the right article", () => {
    expect(aPitch(6)).toBe("a 6/12");
    expect(aPitch(8, true)).toBe("An 8/12");
    expect(aPitch(11)).toBe("an 11/12");
    expect(aPitch(1.5)).toBe("a 1.5/12");
  });
  it("classes follow the IRC thresholds", () => {
    expect(pitchClass(1.5)).toBe("flat");
    expect(pitchClass(3)).toBe("low");
    expect(pitchClass(6)).toBe("conventional");
    expect(pitchClass(8)).toBe("steep");
    expect(pitchClass(22)).toBe("very-steep");
  });
});

describe("roof area from the footprint", () => {
  it("SAM hip example: 44 × 22 ft at 5/12 = 1,048 sq ft, hips 11 ft × 1.474", () => {
    const g = roofFromFootprint({ lengthFt: 44, widthFt: 22, overhangIn: 0, style: "hip", rise: 5, valleysFt: 0 });
    expect(g.roofAreaSqFt).toBeCloseTo(1048.5, 0);
    expect(g.edges.hips / 4).toBeCloseTo(11 * 1.4743, 2);
    expect(g.edges.ridge).toBe(22);
    expect(g.edges.eaves).toBe(132);
  });
  it("30×40 at 6/12 with 1-ft overhangs is 15.0 squares (research worked example)", () => {
    const r = roof({});
    expect(r.roofAreaSqFt).toBeCloseTo(1502.6, 1);
    expect(r.squares).toBeCloseTo(15.03, 2);
    expect(r.edges.eaves).toBe(84);
    expect(r.edges.rakes).toBeCloseTo(71.55, 2);
    expect(r.edges.ridge).toBe(42);
  });
  it("orientation does not matter and zero dimensions give zero", () => {
    expect(roof({ l: 30, w: 40 }).roofAreaSqFt).toBeCloseTo(roof({}).roofAreaSqFt, 6);
    const z = roof({ l: 0 });
    expect(z.roofAreaSqFt).toBe(0);
    expect(z.bundles).toBe(0);
    expect(z.installed.total).toBe(0);
  });
  it("square hip roof is a pyramid with no ridge", () => {
    const g = roofFromFootprint({ lengthFt: 30, widthFt: 30, overhangIn: 0, style: "hip", rise: 6, valleysFt: 0 });
    expect(g.edges.ridge).toBe(0);
    expect(g.edges.hips).toBeCloseTo(4 * 15 * 1.5, 6);
  });
});

describe("waste (CertainTeed Table 4)", () => {
  it("matches table rows and clamps at the ends", () => {
    expect(autoWastePct(1200, "gable")).toBe(6);
    expect(autoWastePct(1200, "hip")).toBe(13);
    expect(autoWastePct(2000, "hip")).toBe(9);
    expect(autoWastePct(300, "gable")).toBe(8);
    expect(autoWastePct(5000, "hip")).toBe(8);
    expect(autoWastePct(1750, "gable")).toBe(5);
    expect(autoWastePct(2000, "complex")).toBe(14);
  });
});

describe("bundles", () => {
  it("2,000 sq ft of roof: 61 bundles of 32.8 sq ft, 60 of 33⅓ (no waste)", () => {
    expect(roof({ mode: "area", area: 2000, wasteAuto: false, waste: 0 }).bundles).toBe(61);
    expect(roof({ mode: "area", area: 2000, wasteAuto: false, waste: 0, product: "ct-landmark" }).bundles).toBe(60);
  });
  it("30×40 6/12 gable: 5% auto waste → 49 bundles", () => {
    const r = roof({});
    expect(r.wastePct).toBe(5);
    expect(r.bundles).toBe(49);
  });
  it("Owens Corning: 3 bundles cover 98.4 sq ft, so 984 sq ft is exactly 30 bundles", () => {
    expect(roof({ mode: "area", area: 984, wasteAuto: false, waste: 0, product: "oc-duration" }).bundles).toBe(30);
    expect(roof({ mode: "area", area: 1000, wasteAuto: false, waste: 0, product: "oc-duration" }).bundles).toBe(31);
  });
  it("brand prices that could not be verified are flagged as typical", () => {
    for (const id of ["gaf-hdz", "iko-cambridge", "atlas-pinnacle"]) expect(SHINGLES.find((x) => x.id === id)?.typicalPrice).toBe(true);
  });
  it("4-bundle lines quadruple per square", () => {
    const r = roof({ mode: "area", area: 1000, wasteAuto: false, waste: 0, product: "custom", bps: 4 });
    expect(r.bundles).toBe(40);
    expect(r.product.sqftPerBundle).toBe(25);
  });
  it("bulk tier kicks in at 39 bundles", () => {
    const small = roof({ mode: "area", area: 1000, wasteAuto: false, waste: 0, product: "oc-duration" });
    const big = roof({ mode: "area", area: 2000, wasteAuto: false, waste: 0, product: "oc-duration" });
    expect(small.bulkApplied).toBe(false);
    expect(small.shingles.unitPrice).toBe(46.99);
    expect(big.bulkApplied).toBe(true);
    expect(big.shingles.cost).toBeCloseTo(61 * 41.85, 2);
  });
  it("every listed product carries starter and cap coverage", () => {
    for (const p of SHINGLES) {
      expect(p.sqftPerBundle).toBeGreaterThan(20);
      expect(p.starter.lfPerBundle).toBeGreaterThan(90);
      expect(p.cap.lfPerBundle).toBeGreaterThanOrEqual(20);
    }
  });
});

describe("starter, ridge cap, drip edge", () => {
  it("starter covers eaves + rakes; caps cover ridge + hips", () => {
    const r = roof({ product: "gaf-hdz" });
    expect(r.starter.lf).toBeCloseTo(84 + 71.55, 1);
    expect(r.starter.qty).toBe(2); // 155.6 / 120.33
    expect(r.cap.qty).toBe(2); // 42 / 25
    expect(roof({ product: "gaf-hdz", rakeStarter: false }).starter.qty).toBe(1);
  });
  it("drip edge: 10-ft pieces lapped 2 in", () => {
    expect(dripEdgePieces(100)).toBe(11);
    expect(dripEdgePieces(98.33)).toBe(10);
    expect(dripEdgePieces(0)).toBe(0);
  });
});

describe("underlayment", () => {
  it("synthetic nets 929 sq ft per roll (OC ProArmor)", () => {
    const u = underlaymentRolls(929, 0, false, "synthetic");
    expect(u.netSqFtPerRoll).toBeCloseTo(929.5, 1);
    expect(u.rolls).toBe(1);
  });
  it("felt nets 408 (#15) and 204 (#30) with 2-in laps", () => {
    expect(underlaymentRolls(1000, 0, false, "felt15").netSqFtPerRoll).toBe(408);
    expect(underlaymentRolls(1000, 0, false, "felt30").netSqFtPerRoll).toBe(204);
  });
  it("low slope roughly doubles the rolls", () => {
    const steep = roof({ pitch: 4 });
    const low = roof({ pitch: 3 });
    expect(steep.underlayment.double).toBe(false);
    expect(low.underlayment.double).toBe(true);
    expect(low.underlayment.qty).toBeGreaterThanOrEqual(2 * steep.underlayment.qty - 1);
    expect(low.warnings.some((w) => w.includes("two layers"))).toBe(true);
  });
  it("cap nails follow the IRC wind grid", () => {
    expect(capNailsPerSqFt(39)).toBeCloseTo(5 / 3.25, 4);
    expect(capNailsPerSqFt(12)).toBeCloseTo(2, 6);
  });
});

describe("ice & water shield (IRC R905.1.2, Fine Homebuilding examples)", () => {
  it("12-in overhang, 2×6 wall: 47 in at 6/12, 50.5 at 8/12, 59⅜ at 12/12 — two courses", () => {
    expect(iceBarrierCourses(6, 12, 6).requiredIn).toBeCloseTo(46.96, 1);
    expect(iceBarrierCourses(8, 12, 6).requiredIn).toBeCloseTo(50.48, 1);
    expect(iceBarrierCourses(12, 12, 6).requiredIn).toBeCloseTo(59.4, 1);
    expect(iceBarrierCourses(6, 12, 6).courses).toBe(2);
  });
  it("one course when it fits in 36 in; 36-in minimum on 8/12+", () => {
    expect(iceBarrierCourses(4, 0, 6).courses).toBe(1);
    expect(iceBarrierCourses(9, 0, 0).requiredIn).toBe(36);
    expect(iceBarrierCourses(4, 24, 8).courses).toBe(2);
  });
  it("rolls include 6-in end laps", () => {
    expect(iceWaterRolls(130, 65)).toBe(3); // 64.5 ft usable per roll
    expect(iceWaterRolls(129, 65)).toBe(2);
    expect(iceWaterRolls(0, 65)).toBe(0);
  });
  it("30×40 6/12: 84 ft of eaves × 2 courses → 3 rolls; valleys only → none", () => {
    const r = roof({});
    expect(r.iceWater?.courses).toBe(2);
    expect(r.iceWater?.qty).toBe(3);
    expect(roof({ iw: "valleys" }).iceWater?.qty).toBe(0);
    expect(roof({ iw: "none" }).iceWater).toBeUndefined();
  });
});

describe("nails", () => {
  it("GAF: 256 per square at 4 nails, 384 at 6", () => {
    expect(roof({ product: "gaf-hdz" }).nails.perSquare).toBe(256);
    expect(roof({ product: "gaf-hdz", nails: 6 }).nails.perSquare).toBe(384);
  });
  it("a 7,200 box covers ~28 squares of field shingles", () => {
    expect(Math.floor(7200 / 256)).toBe(28);
    const r = roof({ mode: "area", area: 2700, wasteAuto: false, waste: 0 });
    expect(r.nails.pack).toBe("coil");
    expect(r.nails.qty).toBe(2);
  });
  it("30×40 6/12 hand check: 4,181 field + 208 starter + 202 cap + 156 drip-edge nails = one coil box", () => {
    const n = roof({}).nails;
    expect(n.field).toBe(4181); // 49 bundles × 21⅓ shingles × 4
    expect(n.accessories).toBe(52 * 4 + 101 * 2 + 156);
    expect(n.pack).toBe("coil");
    expect(n.cost).toBeCloseTo(48.99, 2);
  });
  it("small roofs are priced in 5-lb boxes of hand nails (978 per box)", () => {
    const shed = roof({ l: 12, w: 10, oh: 6, pitch: 4, iw: "none", layers: 0, vent: false, under: "felt15" });
    expect(shed.nails.total).toBeLessThan(978);
    expect(shed.nails.pack).toBe("hand");
    expect(shed.nails.qty).toBe(1);
    expect(shed.nails.cost).toBeCloseTo(21.99, 2);
  });
  it("over 21/12 forces 6 nails", () => {
    const r = roof({ pitch: 22 });
    expect(r.nails.perShingle).toBe(6);
    expect(r.warnings.some((w) => w.includes("6 nails"))).toBe(true);
  });
});

describe("ventilation (IRC R806.2, CertainTeed SAM example)", () => {
  it("1,000 sq ft attic → 480 sq in each side → nine 16×8 intake vents", () => {
    const r = roof({ l: 40, w: 25, oh: 0 });
    expect(r.vent?.intakeSqIn).toBeCloseTo(480, 6);
    expect(r.vent?.undereaveVents).toBe(9);
  });
  it("30×40: 32 ft of ridge vent fits a 42-ft ridge", () => {
    const r = roof({});
    expect(r.vent?.ridgeLfNeeded).toBeCloseTo(32, 6);
    expect(r.vent?.ridgeLf).toBe(32);
    expect(r.vent?.shortfall).toBe(false);
  });
  it("hip roofs with a short ridge are flagged", () => {
    const r = roof({ style: "hip", l: 36, w: 34 });
    expect(r.vent?.shortfall).toBe(true);
  });
});

describe("shingle weight", () => {
  it("architectural ≈ 230 lb per 3-bundle square (CertainTeed Landmark TDS 217–229, IKO under 230)", () => {
    const r = roof({});
    expect(r.shingleWeightLb).toBeCloseTo((49 / 3) * 230, 6);
    expect(roof({ product: "3tab" }).shingleWeightLb / roof({ product: "3tab" }).bundles).toBeCloseTo(190 / 3, 6);
    expect(roof({ l: 0 }).shingleWeightLb).toBe(0);
  });
});

describe("tear-off, dumpster and installed cost", () => {
  it("IKO: 25 squares of laminate ≈ 6,000 lb", () => {
    const r = roof({ mode: "area", area: 2500 });
    expect(r.debris?.lb).toBe(6000);
    expect(r.debris?.cubicYards).toBe(12.5);
  });
  it("dumpster sized by volume and weight", () => {
    expect(pickDumpster(7.5, 1.8)?.yd).toBe(20);
    expect(pickDumpster(5, 0.8)?.yd).toBe(10);
    const big = pickDumpster(25, 3.6);
    expect(big?.yd).toBe(30);
    expect(big?.overTons).toBeCloseTo(0.6, 6);
    expect(pickDumpster(0, 0)).toBeUndefined();
  });
  it("no tear-off means no debris and a tear-off credit", () => {
    const r = roof({ layers: 0 });
    expect(r.debris).toBeUndefined();
    expect(r.installed.tearoffAdjust).toBeCloseTo(-r.squares * 125, 6);
  });
  it("installed = squares × $/sq + extras; steep roofs add a surcharge", () => {
    const r = roof({});
    expect(r.installed.total).toBeCloseTo(r.squares * 550 + 325, 6);
    const s = roof({ pitch: 8, layers: 2 });
    expect(s.installed.steep).toBeCloseTo(s.squares * 75, 6);
    expect(s.installed.tearoffAdjust).toBeCloseTo(s.squares * 100, 6);
    expect(s.installed.low).toBeLessThan(s.installed.total);
    expect(s.installed.high).toBeGreaterThan(s.installed.total);
  });
  it("a custom $/square below the tear-off credit never goes negative", () => {
    expect(roof({ layers: 0, inst: 50, permit: 0 }).installed.total).toBe(0);
  });
});

describe("warnings", () => {
  it("blocks shingles under 2/12 and flags thin waste", () => {
    expect(roof({ pitch: 1 }).warnings.some((w) => w.includes("2/12"))).toBe(true);
    expect(roof({ wasteAuto: false, waste: 0, style: "hip" }).warnings.some((w) => w.includes("CertainTeed"))).toBe(true);
    expect(roof({ style: "complex" }).warnings.some((w) => w.includes("valleys"))).toBe(true);
  });
});

describe("metal roofing", () => {
  it("30×40 gable at 4/12, 36-in panels: 14 per side, 16' 11\" long", () => {
    const r = metal({});
    expect(r.panelsPerSide).toBe(14); // 42 ft ÷ 3 ft
    expect(r.panels).toBe(28);
    expect(r.panelLengthFt * 12).toBe(203); // 16 ft run × 1.0541 = 202.4 in → 203 in
    expect(r.screws).toBe(ceil(r.roofAreaSqFt * 0.8));
    expect(r.ridgePieces).toBe(5);
  });
  it("5V uses 24-in coverage", () => {
    expect(metal({ profile: "5v" }).panelsPerSide).toBe(21);
  });
  it("stock lengths round up and warn past the longest panel", () => {
    const r = metal({ stock: true });
    expect(r.stock).toMatchObject({ ft: 20, price: 80.99, pieces: 1, count: 28 });
    expect(r.panelCost).toBeCloseTo(28 * 80.99, 6);
    expect(r.warnings.some((w) => w.includes("37 in to trim"))).toBe(true);
    const long = metal({ stock: true, w: 50 });
    expect(long.stock).toBeUndefined();
    expect(long.warnings.some((w) => w.includes("stock panels"))).toBe(true);
  });
  it("short slopes cut two pieces from one stock panel when that is cheaper", () => {
    // 10×12 shed, 6-in overhangs: 5' 10" panels. 10 × 8 ft = $309.90; 5 × 12 ft cut in half = $254.95.
    const r = metal({ l: 12, w: 10, eave: 6, rake: 6, stock: true });
    expect(r.panels).toBe(10);
    expect(r.panelLengthFt * 12).toBe(70);
    expect(r.stock).toMatchObject({ ft: 12, pieces: 2, count: 5 });
    expect(r.panelCost).toBeCloseTo(254.95, 2);
    expect(stockPlan(METAL_PROFILES[0].stock, 13.75, 18)).toMatchObject({ ft: 14, pieces: 1, count: 18 });
    expect(stockPlan(METAL_PROFILES[0].stock, 0, 18)).toBeUndefined();
  });
  it("shed roofs have one slope across the full width", () => {
    const r = metal({ style: "shed", w: 12, l: 16, eave: 6, rake: 6 });
    expect(r.sides).toBe(1);
    expect(r.panelsPerSide).toBe(6);
    expect(r.panelLengthFt).toBeCloseTo(Math.ceil(13 * Math.sqrt(1 + (4 / 12) ** 2) * 12) / 12, 6);
  });
  it("low slopes warn; zero size gives zero and no stray warnings", () => {
    expect(metal({ pitch: 2 }).warnings.some((w) => w.includes("2.5/12"))).toBe(true);
    const z = metal({ l: 0, stock: true });
    expect(z.panels).toBe(0);
    expect(z.panelCost).toBe(0);
    expect(z.stock).toBeUndefined();
    expect(z.warnings).toEqual([]);
  });
  it("29 ga weighs 0.70 lb per sq ft", () => {
    const r = metal({});
    expect(r.weightLb).toBeCloseTo(r.roofAreaSqFt * 0.7, 6);
  });
});

describe("hostile inputs stay finite and non-negative", () => {
  const finite = (o: unknown): boolean =>
    typeof o === "number" ? Number.isFinite(o) : o && typeof o === "object" ? Object.values(o).every(finite) : true;
  it("shingle roof", () => {
    for (const over of [{ pitch: -4 }, { l: -10, w: 30 }, { l: 1e5, w: 1e5 }, { oh: -12, wall: -6 }, { mode: "area", area: -50, eaves: -3 }, { layers: 9, roll: 12, nails: 5 }, { product: "custom", bps: 0 }, { product: "nope" }]) {
      const r = roof(over as Partial<typeof ROOFING_DEFAULTS>);
      expect(finite(r), JSON.stringify(over)).toBe(true);
      expect(r.bundles).toBeGreaterThanOrEqual(0);
      expect(r.installed.total).toBeGreaterThanOrEqual(0);
    }
  });
  it("metal roof and pitch", () => {
    for (const over of [{ pitch: -2 }, { eave: -12, rake: -12 }, { l: 1e5, stock: true }, { profile: "nope" }]) expect(finite(metal(over as Partial<typeof METAL_DEFAULTS>)), JSON.stringify(over)).toBe(true);
    for (const over of [{ mode: "angle", angle: 120 }, { mode: "measure", mRise: -3, mRun: -12 }, { span: -10, oh: -5 }]) expect(finite(pitch(over)), JSON.stringify(over)).toBe(true);
  });
});

describe("pitch calculator", () => {
  it("6/12 → 26.57°, 50% grade; 28-ft span rafter with 12-in overhang", () => {
    const r = pitch({});
    expect(r.angleDeg).toBeCloseTo(26.57, 2);
    expect(r.gradePct).toBe(50);
    expect(r.ridgeHeightFt).toBe(7);
    expect(r.rafterFt).toBeCloseTo(15 * 1.118, 2);
  });
  it("angle and measured modes convert to x/12", () => {
    expect(pitch({ mode: "angle", angle: 45 }).rise).toBeCloseTo(12, 6);
    expect(pitch({ mode: "measure", mRise: 4.5, mRun: 18 }).rise).toBeCloseTo(3, 6);
    expect(pitch({ mode: "measure", mRun: 0 }).rise).toBe(0);
  });
});

function ceil(n: number) {
  return Math.ceil(n - 1e-9);
}
